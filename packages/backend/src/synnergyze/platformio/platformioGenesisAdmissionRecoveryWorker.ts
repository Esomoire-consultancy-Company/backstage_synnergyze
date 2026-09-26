import {
  GenesisAdmissionJournalEntry,
  GenesisAdmissionJournalStore,
  assertJournalTransition,
} from './platformioGenesisAdmissionJournal';
import {
  GenesisAdmissionMutationReceipt,
  GenesisAdmissionMutationResult,
} from './platformioGenesisAdmissionExecution';
import {
  GenesisEffectInspection,
} from './platformioGenesisAdmissionReconciliation';
import {
  GenesisAdmissionVerificationReceipt,
  GenesisAdmissionVerificationResult,
} from './platformioGenesisAdmissionVerification';

export interface PlatformIOGenesisRecoveryPorts {
  journal: GenesisAdmissionJournalStore;
  inspectEffect: (
    entry: GenesisAdmissionJournalEntry,
  ) => Promise<GenesisEffectInspection>;
  commitReservation: (input: {
    reservationRef: string;
    decisionRef: string;
    idempotencyKey: string;
    reason: string;
  }) => Promise<void>;
  releaseReservation: (input: {
    reservationRef: string;
    decisionRef: string;
    idempotencyKey: string;
    reason: string;
  }) => Promise<void>;
  recordMutationEvidence: (
    receipt: GenesisAdmissionMutationReceipt,
  ) => Promise<void>;
  verifyMutation: (
    mutation: GenesisAdmissionMutationResult,
  ) => Promise<GenesisAdmissionVerificationResult>;
  markCanonicalVerified: (input: {
    canonicalId: string;
    mutationRef: string;
    verificationRef: string;
  }) => Promise<void>;
  holdCanonicalForReconciliation: (input: {
    canonicalId: string;
    mutationRef: string;
    verificationRef: string;
    reason?: string;
  }) => Promise<void>;
  recordVerificationEvidence: (
    receipt: GenesisAdmissionVerificationReceipt,
  ) => Promise<void>;
  recordRecoveryEvidence: (receipt: {
    eventType: 'platformio.genesis_admission.recovery';
    idempotencyKey: string;
    fromState: string;
    toState: string;
    reason: string;
    recordedAt: string;
  }) => Promise<void>;
  now?: () => Date;
}

function now(ports: PlatformIOGenesisRecoveryPorts) {
  return (ports.now ?? (() => new Date()))();
}

async function transition(
  entry: GenesisAdmissionJournalEntry,
  to: GenesisAdmissionJournalEntry['state'],
  ports: PlatformIOGenesisRecoveryPorts,
  patch: Partial<GenesisAdmissionJournalEntry>,
  reason: string,
) {
  assertJournalTransition(entry.state, to);
  const recordedAt = now(ports).toISOString();

  const updated = await ports.journal.update(
    entry.idempotencyKey,
    current => ({
      ...current,
      ...patch,
      state: to,
      updatedAt: recordedAt,
    }),
  );

  await ports.recordRecoveryEvidence({
    eventType: 'platformio.genesis_admission.recovery',
    idempotencyKey: entry.idempotencyKey,
    fromState: entry.state,
    toState: to,
    reason,
    recordedAt,
  });

  return updated;
}

function mutationReceiptFromJournal(
  entry: GenesisAdmissionJournalEntry,
  mutation: GenesisAdmissionMutationResult,
  recordedAt: string,
): GenesisAdmissionMutationReceipt {
  return {
    eventType: 'platformio.genesis_admission.mutated',
    proposalId: entry.proposalId,
    candidateRef: entry.candidateRef,
    admissionDecisionRef: entry.admissionDecisionRef,
    reservationRef: entry.reservationRef,
    mutation: mutation.mutation,
    canonicalId: mutation.canonicalId,
    mutationRef: mutation.mutationRef,
    mutationSucceeded: true,
    canonicalState: 'PENDING_VERIFICATION',
    canonicalTruthEstablished: false,
    recordedAt,
  };
}

async function ensureMutationEvidenceAndReservation(
  entry: GenesisAdmissionJournalEntry,
  mutation: GenesisAdmissionMutationResult,
  ports: PlatformIOGenesisRecoveryPorts,
) {
  if (entry.reservationTerminalState !== 'COMMITTED') {
    await ports.commitReservation({
      reservationRef: entry.reservationRef,
      decisionRef: entry.admissionDecisionRef,
      idempotencyKey: entry.idempotencyKey,
      reason: 'RECOVERY_EFFECT_CONFIRMED',
    });
  }

  if (!entry.mutationEvidenceRecorded) {
    await ports.recordMutationEvidence(
      mutationReceiptFromJournal(entry, mutation, now(ports).toISOString()),
    );
  }

  return ports.journal.update(entry.idempotencyKey, current => ({
    ...current,
    mutationResult: mutation,
    reservationTerminalState: 'COMMITTED',
    mutationEvidenceRecorded: true,
    updatedAt: now(ports).toISOString(),
  }));
}

async function resumeVerification(
  entry: GenesisAdmissionJournalEntry,
  mutation: GenesisAdmissionMutationResult,
  ports: PlatformIOGenesisRecoveryPorts,
) {
  const verification = await ports.verifyMutation(mutation);

  if (verification.canonicalId !== mutation.canonicalId) {
    return transition(
      entry,
      'RECONCILIATION_REQUIRED',
      { lastError: 'GENESIS_ADMISSION_VERIFICATION_TARGET_MISMATCH' },
      ports,
      'VERIFICATION_TARGET_MISMATCH',
    );
  }

  const recordedAt = now(ports).toISOString();

  if (verification.verified) {
    await ports.markCanonicalVerified({
      canonicalId: mutation.canonicalId,
      mutationRef: mutation.mutationRef,
      verificationRef: verification.verificationRef,
    });

    if (!entry.verificationEvidenceRecorded) {
      await ports.recordVerificationEvidence({
        eventType: 'platformio.genesis_admission.verified',
        canonicalId: mutation.canonicalId,
        mutationRef: mutation.mutationRef,
        verificationRef: verification.verificationRef,
        verified: true,
        resultingState: 'VERIFIED',
        canonicalTruthEstablished: true,
        recordedAt,
      });
    }

    return transition(
      entry,
      'VERIFIED',
      {
        verificationEvidenceRecorded: true,
        verificationRef: verification.verificationRef,
        canonicalTruthEstablished: true,
        lastError: undefined,
      },
      ports,
      'POST_RESTART_VERIFICATION_SUCCEEDED',
    );
  }

  await ports.holdCanonicalForReconciliation({
    canonicalId: mutation.canonicalId,
    mutationRef: mutation.mutationRef,
    verificationRef: verification.verificationRef,
    reason: verification.reason,
  });

  if (!entry.verificationEvidenceRecorded) {
    await ports.recordVerificationEvidence({
      eventType: 'platformio.genesis_admission.verified',
      canonicalId: mutation.canonicalId,
      mutationRef: mutation.mutationRef,
      verificationRef: verification.verificationRef,
      verified: false,
      resultingState: 'RECONCILIATION_REQUIRED',
      canonicalTruthEstablished: false,
      recordedAt,
    });
  }

  return transition(
    entry,
    'RECONCILIATION_REQUIRED',
    {
      verificationEvidenceRecorded: true,
      verificationRef: verification.verificationRef,
      canonicalTruthEstablished: false,
      lastError: verification.reason,
    },
    ports,
    'POST_RESTART_VERIFICATION_FAILED',
  );
}

export async function recoverPlatformIOGenesisAdmissionEntry(
  entry: GenesisAdmissionJournalEntry,
  ports: PlatformIOGenesisRecoveryPorts,
) {
  if (entry.state === 'VERIFIED' || entry.state === 'CLOSED_NO_EFFECT') {
    return entry;
  }

  if (
    (entry.state === 'MUTATED' || entry.state === 'VERIFICATION_PENDING') &&
    entry.mutationResult
  ) {
    const withEvidence = await ensureMutationEvidenceAndReservation(
      entry,
      entry.mutationResult,
      ports,
    );

    if (withEvidence.state !== 'VERIFICATION_PENDING') {
      const pending = await transition(
        withEvidence,
        'VERIFICATION_PENDING',
        {},
        ports,
        'MUTATION_CONFIRMED_RESUME_VERIFICATION',
      );
      return resumeVerification(pending, entry.mutationResult, ports);
    }

    return resumeVerification(withEvidence, entry.mutationResult, ports);
  }

  const inspection = await ports.inspectEffect(entry);

  if (inspection.resolution === 'NO_EFFECT_CONFIRMED') {
    if (entry.reservationTerminalState !== 'RELEASED') {
      await ports.releaseReservation({
        reservationRef: entry.reservationRef,
        decisionRef: entry.admissionDecisionRef,
        idempotencyKey: entry.idempotencyKey,
        reason: inspection.reason ?? 'RECOVERY_NO_EFFECT_CONFIRMED',
      });
    }

    return transition(
      entry,
      'CLOSED_NO_EFFECT',
      {
        effectResolution: 'NO_EFFECT_CONFIRMED',
        reservationTerminalState: 'RELEASED',
        canonicalTruthEstablished: false,
        lastError: inspection.reason,
      },
      ports,
      'RECOVERY_NO_EFFECT_CONFIRMED',
    );
  }

  if (
    inspection.resolution === 'EFFECT_CONFIRMED' &&
    inspection.mutationResult
  ) {
    const mutated = await transition(
      entry,
      'MUTATED',
      {
        effectResolution: 'EFFECT_CONFIRMED',
        mutationResult: inspection.mutationResult,
        lastError: undefined,
      },
      ports,
      'RECOVERY_EFFECT_CONFIRMED',
    );

    return recoverPlatformIOGenesisAdmissionEntry(mutated, ports);
  }

  if (entry.reservationTerminalState !== 'COMMITTED') {
    await ports.commitReservation({
      reservationRef: entry.reservationRef,
      decisionRef: entry.admissionDecisionRef,
      idempotencyKey: entry.idempotencyKey,
      reason: 'RECOVERY_EFFECT_UNCERTAIN',
    });
  }

  if (entry.state === 'RECONCILIATION_REQUIRED') {
    return ports.journal.update(entry.idempotencyKey, current => ({
      ...current,
      effectResolution: 'EFFECT_UNCERTAIN',
      reservationTerminalState: 'COMMITTED',
      lastError: inspection.reason ?? current.lastError,
      updatedAt: now(ports).toISOString(),
    }));
  }

  return transition(
    entry,
    'RECONCILIATION_REQUIRED',
    {
      effectResolution: 'EFFECT_UNCERTAIN',
      reservationTerminalState: 'COMMITTED',
      canonicalTruthEstablished: false,
      lastError: inspection.reason,
    },
    ports,
    'RECOVERY_EFFECT_UNCERTAIN',
  );
}

export async function runPlatformIOGenesisRecoverySweep(
  ports: PlatformIOGenesisRecoveryPorts,
  input: {
    olderThan: string;
    limit?: number;
  },
) {
  const entries = await ports.journal.scanIncomplete({
    olderThan: input.olderThan,
    limit: input.limit ?? 100,
  });

  const results = [];

  for (const entry of entries) {
    try {
      results.push({
        idempotencyKey: entry.idempotencyKey,
        ok: true,
        entry: await recoverPlatformIOGenesisAdmissionEntry(entry, ports),
      });
    } catch (error) {
      results.push({
        idempotencyKey: entry.idempotencyKey,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
