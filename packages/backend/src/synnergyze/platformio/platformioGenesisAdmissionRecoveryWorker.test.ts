import {
  recoverPlatformIOGenesisAdmissionEntry,
  runPlatformIOGenesisRecoverySweep,
} from './platformioGenesisAdmissionRecoveryWorker';
import {
  GenesisAdmissionJournalEntry,
} from './platformioGenesisAdmissionJournal';

function entry(
  overrides: Partial<GenesisAdmissionJournalEntry> = {},
): GenesisAdmissionJournalEntry {
  return {
    idempotencyKey: 'IDEMP-001',
    proposalId: 'PROPOSAL-001',
    candidateRef: 'CANDIDATE-001',
    admissionDecisionRef: 'WARDEN-001',
    reservationRef: 'RESERVATION-001',
    state: 'PREPARED',
    mutationEvidenceRecorded: false,
    verificationEvidenceRecorded: false,
    canonicalTruthEstablished: false,
    createdAt: '2026-09-26T05:00:00.000Z',
    updatedAt: '2026-09-26T05:00:00.000Z',
    ...overrides,
  };
}

function harness(initial: GenesisAdmissionJournalEntry) {
  let current = initial;
  const commits: unknown[] = [];
  const releases: unknown[] = [];
  const mutationEvidence: unknown[] = [];
  const verificationEvidence: unknown[] = [];

  return {
    state: () => current,
    commits,
    releases,
    mutationEvidence,
    verificationEvidence,
    ports: {
      journal: {
        get: async () => current,
        putIfAbsent: async () => current,
        update: async (
          _key: string,
          mutate: (value: GenesisAdmissionJournalEntry) => GenesisAdmissionJournalEntry,
        ) => {
          current = mutate(current);
          return current;
        },
        scanIncomplete: async () => [current],
      },
      inspectEffect: async () => ({
        resolution: 'EFFECT_UNCERTAIN' as const,
      }),
      commitReservation: async (input: unknown) => {
        commits.push(input);
      },
      releaseReservation: async (input: unknown) => {
        releases.push(input);
      },
      recordMutationEvidence: async (receipt: unknown) => {
        mutationEvidence.push(receipt);
      },
      verifyMutation: async (mutation: { canonicalId: string }) => ({
        verificationRef: 'VERIFY-001',
        canonicalId: mutation.canonicalId,
        verified: true,
      }),
      markCanonicalVerified: async () => undefined,
      holdCanonicalForReconciliation: async () => undefined,
      recordVerificationEvidence: async (receipt: unknown) => {
        verificationEvidence.push(receipt);
      },
      recordRecoveryEvidence: async () => undefined,
      now: () => new Date('2026-09-26T06:30:00.000Z'),
    },
  };
}

describe('PlatformIO Genesis admission recovery worker', () => {
  it('releases reservation and closes only after no-effect is established', async () => {
    const h = harness(entry());
    h.ports.inspectEffect = async () => ({
      resolution: 'NO_EFFECT_CONFIRMED',
      reason: 'GENESIS_MUTATION_ABSENT',
    });

    const result = await recoverPlatformIOGenesisAdmissionEntry(
      h.state(),
      h.ports as never,
    );

    expect(h.releases).toHaveLength(1);
    expect(h.commits).toHaveLength(0);
    expect(result.state).toBe('CLOSED_NO_EFFECT');
  });

  it('recovers a confirmed mutation, backfills evidence, and resumes verification', async () => {
    const h = harness(entry());
    h.ports.inspectEffect = async () => ({
      resolution: 'EFFECT_CONFIRMED',
      mutationResult: {
        canonicalId: 'GENESIS-DEVICE-101',
        mutationRef: 'MUTATION-001',
        mutation: 'CREATE_CANONICAL_OBJECT',
        state: 'PENDING_VERIFICATION',
      },
    });

    const result = await recoverPlatformIOGenesisAdmissionEntry(
      h.state(),
      h.ports as never,
    );

    expect(h.commits).toHaveLength(1);
    expect(h.mutationEvidence).toHaveLength(1);
    expect(h.verificationEvidence).toHaveLength(1);
    expect(result.state).toBe('VERIFIED');
    expect(result.canonicalTruthEstablished).toBe(true);
  });

  it('does not redispatch mutation when effect remains uncertain', async () => {
    const h = harness(entry());

    const result = await recoverPlatformIOGenesisAdmissionEntry(
      h.state(),
      h.ports as never,
    );

    expect(h.commits).toHaveLength(1);
    expect(result.state).toBe('RECONCILIATION_REQUIRED');
    expect(result.canonicalTruthEstablished).toBe(false);
  });

  it('resumes verification directly from an already journaled mutation', async () => {
    const h = harness(
      entry({
        state: 'MUTATED',
        mutationResult: {
          canonicalId: 'GENESIS-DEVICE-101',
          mutationRef: 'MUTATION-001',
          mutation: 'CREATE_CANONICAL_OBJECT',
          state: 'PENDING_VERIFICATION',
        },
        reservationTerminalState: 'COMMITTED',
      }),
    );

    const result = await recoverPlatformIOGenesisAdmissionEntry(
      h.state(),
      h.ports as never,
    );

    expect(h.mutationEvidence).toHaveLength(1);
    expect(result.state).toBe('VERIFIED');
  });

  it('sweeps incomplete attempts independently so one failure does not block others', async () => {
    const h = harness(entry());
    h.ports.verifyMutation = async () => {
      throw new Error('verification backend unavailable');
    };

    const results = await runPlatformIOGenesisRecoverySweep(
      h.ports as never,
      {
        olderThan: '2026-09-26T06:00:00.000Z',
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      idempotencyKey: 'IDEMP-001',
      ok: false,
      error: 'verification backend unavailable',
    });
  });
});
