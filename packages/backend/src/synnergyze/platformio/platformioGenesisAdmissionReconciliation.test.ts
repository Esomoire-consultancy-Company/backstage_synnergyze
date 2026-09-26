import {
  executePlatformIOGenesisAdmissionSafely,
  platformIOGenesisAdmissionIdempotencyKey,
} from './platformioGenesisAdmissionReconciliation';
import {
  GenesisAdmissionProposal,
} from './platformioGenesisAdmission';
import {
  GenesisDiscoveredDeviceCandidate,
} from './platformioGenesisProjection';

const candidate: GenesisDiscoveredDeviceCandidate = {
  kind: 'DISCOVERED_DEVICE',
  candidateRef: 'GENESIS-CANDIDATE-DEVICE-001',
  lifecycleStatus: 'PROVISIONAL',
  providerObservation: { hardwareId: 'HW-001' },
  correlationKeys: ['platformio:hwid:HW-001'],
  provenance: {
    providerId: 'PROVIDER-PLATFORMIO-001',
    adapterId: 'ADAPTER-PLATFORMIO-001',
    capabilityId: 'platformio.device.list',
    requestId: 'REQ-001',
    wardenDecisionRef: 'WARDEN-OBSERVE-001',
    riverEvidenceRef: 'RIVER-001',
    observedAt: '2026-09-26T05:00:00.000Z',
  },
  canonicalGenesisDeviceId: null,
  verified: false,
};

const proposal: GenesisAdmissionProposal = {
  proposalId: 'PROPOSAL-001',
  source: 'PLATFORMIO',
  candidateRef: candidate.candidateRef,
  candidateKind: candidate.kind,
  proposalKind: 'CREATE_CANONICAL_OBJECT',
  requestedCanonicalKind: 'DEVICE',
  correlationClassification: 'NEW',
  correlationStrength: 'NONE',
  wardenAdmissionRequired: true,
  riverEvidenceRefs: ['RIVER-001'],
  sourceWardenDecisionRef: 'WARDEN-OBSERVE-001',
  sourceRequestId: 'REQ-001',
  canonicalMutationAuthorized: false,
  canonicalMutationPerformed: false,
  status: 'PROPOSED',
};

const decision = {
  decisionRef: 'WARDEN-ADMISSION-001',
  proposalId: proposal.proposalId,
  candidateRef: candidate.candidateRef,
  mutation: 'CREATE_CANONICAL_OBJECT' as const,
  canonicalKind: 'DEVICE' as const,
  allowed: true,
  reservationRef: 'RESERVATION-001',
};

const mutation = {
  canonicalId: 'GENESIS-DEVICE-101',
  mutationRef: 'MUTATION-001',
  mutation: 'CREATE_CANONICAL_OBJECT' as const,
  state: 'PENDING_VERIFICATION' as const,
};

function ports(overrides: Record<string, unknown> = {}) {
  return {
    findAttempt: async () => undefined,
    prepareAttempt: async () => undefined,
    markAttemptMutated: async () => undefined,
    markAttemptForReconciliation: async () => undefined,
    performMutation: async () => mutation,
    inspectEffect: async () => ({
      resolution: 'NO_EFFECT_CONFIRMED' as const,
    }),
    commitReservation: async () => undefined,
    releaseReservation: async () => undefined,
    recordMutationEvidence: async () => undefined,
    recordReconciliationEvidence: async () => undefined,
    ...overrides,
  };
}

describe('PlatformIO Genesis admission reconciliation', () => {
  it('derives a stable idempotency key from the admission proposal', () => {
    expect(platformIOGenesisAdmissionIdempotencyKey(proposal)).toBe(
      'platformio:genesis-admission:PROPOSAL-001:GENESIS-CANDIDATE-DEVICE-001:CREATE_CANONICAL_OBJECT:new',
    );
  });

  it('commits the reservation after a confirmed mutation', async () => {
    const commits: unknown[] = [];

    const result = await executePlatformIOGenesisAdmissionSafely(
      proposal,
      candidate,
      decision,
      ports({
        commitReservation: async (input: unknown) => {
          commits.push(input);
        },
      }) as never,
    );

    expect(commits).toHaveLength(1);
    expect(result).toMatchObject({
      reservationState: 'COMMITTED',
      verificationRequired: true,
      canonicalTruthEstablished: false,
    });
  });

  it('replays a recorded mutation without performing it twice', async () => {
    const performMutation = jest.fn();

    const result = await executePlatformIOGenesisAdmissionSafely(
      proposal,
      candidate,
      decision,
      ports({
        findAttempt: async () => ({
          idempotencyKey: platformIOGenesisAdmissionIdempotencyKey(proposal),
          proposalId: proposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: proposal.proposalKind,
          admissionDecisionRef: decision.decisionRef,
          reservationRef: decision.reservationRef,
          state: 'MUTATED' as const,
          mutationResult: mutation,
        }),
        performMutation,
      }) as never,
    );

    expect(performMutation).not.toHaveBeenCalled();
    expect(result.replayed).toBe(true);
  });

  it('releases the reservation only when no effect is confirmed', async () => {
    const releases: unknown[] = [];
    const commits: unknown[] = [];

    await expect(
      executePlatformIOGenesisAdmissionSafely(
        proposal,
        candidate,
        decision,
        ports({
          performMutation: async () => {
            throw new Error('transport failed before mutation');
          },
          inspectEffect: async () => ({
            resolution: 'NO_EFFECT_CONFIRMED' as const,
            reason: 'GENESIS_TRANSACTION_ABSENT',
          }),
          releaseReservation: async (input: unknown) => {
            releases.push(input);
          },
          commitReservation: async (input: unknown) => {
            commits.push(input);
          },
        }) as never,
      ),
    ).rejects.toThrow('transport failed before mutation');

    expect(releases).toHaveLength(1);
    expect(commits).toHaveLength(0);
  });

  it('commits and holds reconciliation when effect is uncertain', async () => {
    const commits: unknown[] = [];
    const holds: unknown[] = [];

    await expect(
      executePlatformIOGenesisAdmissionSafely(
        proposal,
        candidate,
        decision,
        ports({
          performMutation: async () => {
            throw new Error('connection lost after dispatch');
          },
          inspectEffect: async () => ({
            resolution: 'EFFECT_UNCERTAIN' as const,
            reason: 'GENESIS_RESULT_UNAVAILABLE',
          }),
          markAttemptForReconciliation: async (...args: unknown[]) => {
            holds.push(args);
          },
          commitReservation: async (input: unknown) => {
            commits.push(input);
          },
        }) as never,
      ),
    ).rejects.toThrow('GENESIS_ADMISSION_EFFECT_UNCERTAIN');

    expect(commits).toHaveLength(1);
    expect(holds).toHaveLength(1);
  });

  it('recovers a confirmed effect after an exception and backfills evidence', async () => {
    const receipts: unknown[] = [];

    const result = await executePlatformIOGenesisAdmissionSafely(
      proposal,
      candidate,
      decision,
      ports({
        performMutation: async () => {
          throw new Error('response lost');
        },
        inspectEffect: async () => ({
          resolution: 'EFFECT_CONFIRMED' as const,
          mutationResult: mutation,
        }),
        recordMutationEvidence: async (receipt: unknown) => {
          receipts.push(receipt);
        },
      }) as never,
    );

    expect(result.mutation).toEqual(mutation);
    expect(receipts).toHaveLength(1);
  });
});
