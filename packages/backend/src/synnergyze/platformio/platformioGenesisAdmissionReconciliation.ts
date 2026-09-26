import {
  GenesisAdmissionDecision,
  GenesisAdmissionMutation,
  GenesisAdmissionMutationReceipt,
  GenesisAdmissionMutationResult,
} from './platformioGenesisAdmissionExecution';
import {
  GenesisAdmissionProposal,
} from './platformioGenesisAdmission';
import {
  GenesisPlatformIOCandidate,
} from './platformioGenesisProjection';

export type GenesisEffectResolution =
  | 'EFFECT_CONFIRMED'
  | 'NO_EFFECT_CONFIRMED'
  | 'EFFECT_UNCERTAIN';

export type WardenReservationTerminalState = 'COMMITTED' | 'RELEASED';

export interface GenesisAdmissionAttempt {
  idempotencyKey: string;
  proposalId: string;
  candidateRef: string;
  mutation: GenesisAdmissionMutation;
  targetCanonicalId?: string;
  admissionDecisionRef: string;
  reservationRef: string;
  state: 'PREPARED' | 'MUTATED' | 'RECONCILIATION_REQUIRED';
  mutationResult?: GenesisAdmissionMutationResult;
}

export interface GenesisEffectInspection {
  resolution: GenesisEffectResolution;
  mutationResult?: GenesisAdmissionMutationResult;
  reason?: string;
}

export interface GenesisAdmissionReconciliationReceipt {
  eventType: 'platformio.genesis_admission.reconciled';
  idempotencyKey: string;
  proposalId: string;
  candidateRef: string;
  admissionDecisionRef: string;
  reservationRef: string;
  effectResolution: GenesisEffectResolution;
  reservationState: WardenReservationTerminalState;
  mutationRef?: string;
  canonicalId?: string;
  reason?: string;
  recordedAt: string;
}

export interface PlatformIOGenesisReconciliationPorts {
  findAttempt: (
    idempotencyKey: string,
  ) => Promise<GenesisAdmissionAttempt | undefined>;
  prepareAttempt: (attempt: GenesisAdmissionAttempt) => Promise<void>;
  markAttemptMutated: (
    idempotencyKey: string,
    mutationResult: GenesisAdmissionMutationResult,
  ) => Promise<void>;
  markAttemptForReconciliation: (
    idempotencyKey: string,
    reason?: string,
  ) => Promise<void>;
  performMutation: (input: {
    proposal: GenesisAdmissionProposal;
    candidate: GenesisPlatformIOCandidate;
    decision: GenesisAdmissionDecision;
    idempotencyKey: string;
  }) => Promise<GenesisAdmissionMutationResult>;
  inspectEffect: (
    attempt: GenesisAdmissionAttempt,
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
  recordReconciliationEvidence: (
    receipt: GenesisAdmissionReconciliationReceipt,
  ) => Promise<void>;
  now?: () => Date;
}

function targetFor(proposal: GenesisAdmissionProposal) {
  return proposal.proposalKind === 'BIND_TO_EXISTING_OBJECT'
    ? proposal.matchedCanonicalId
    : undefined;
}

export function platformIOGenesisAdmissionIdempotencyKey(
  proposal: GenesisAdmissionProposal,
) {
  const target = targetFor(proposal) ?? 'new';
  return [
    'platformio',
    'genesis-admission',
    proposal.proposalId,
    proposal.candidateRef,
    proposal.proposalKind,
    target,
  ].join(':');
}

function assertEffectDecision(
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
  decision: GenesisAdmissionDecision,
) {
  if (!decision.allowed) {
    throw new Error(
      `WARDEN_ADMISSION_DENIED:${decision.decisionRef}:${
        decision.reason ?? 'DENIED'
      }`,
    );
  }
  if (!decision.reservationRef) {
    throw new Error('WARDEN_ADMISSION_RESERVATION_REQUIRED');
  }
  if (
    decision.proposalId !== proposal.proposalId ||
    decision.candidateRef !== candidate.candidateRef ||
    decision.mutation !== proposal.proposalKind
  ) {
    throw new Error('WARDEN_ADMISSION_DECISION_SCOPE_MISMATCH');
  }
  if (
    proposal.proposalKind === 'BIND_TO_EXISTING_OBJECT' &&
    decision.targetCanonicalId !== proposal.matchedCanonicalId
  ) {
    throw new Error('WARDEN_ADMISSION_TARGET_MISMATCH');
  }
}

function mutationReceipt(
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
  decision: GenesisAdmissionDecision,
  result: GenesisAdmissionMutationResult,
  recordedAt: string,
): GenesisAdmissionMutationReceipt {
  return {
    eventType: 'platformio.genesis_admission.mutated',
    proposalId: proposal.proposalId,
    candidateRef: candidate.candidateRef,
    admissionDecisionRef: decision.decisionRef,
    reservationRef: decision.reservationRef!,
    mutation: result.mutation,
    canonicalId: result.canonicalId,
    mutationRef: result.mutationRef,
    mutationSucceeded: true,
    canonicalState: 'PENDING_VERIFICATION',
    canonicalTruthEstablished: false,
    recordedAt,
  };
}

async function commitAndBackfill(
  attempt: GenesisAdmissionAttempt,
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
  decision: GenesisAdmissionDecision,
  result: GenesisAdmissionMutationResult,
  ports: PlatformIOGenesisReconciliationPorts,
  reason: string,
) {
  await ports.commitReservation({
    reservationRef: decision.reservationRef!,
    decisionRef: decision.decisionRef,
    idempotencyKey: attempt.idempotencyKey,
    reason,
  });

  await ports.recordMutationEvidence(
    mutationReceipt(
      proposal,
      candidate,
      decision,
      result,
      (ports.now ?? (() => new Date()))().toISOString(),
    ),
  );

  return {
    mutation: result,
    reservationState: 'COMMITTED' as const,
    replayed: attempt.state === 'MUTATED',
    verificationRequired: true as const,
    canonicalTruthEstablished: false as const,
  };
}

export async function executePlatformIOGenesisAdmissionSafely(
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
  decision: GenesisAdmissionDecision,
  ports: PlatformIOGenesisReconciliationPorts,
) {
  assertEffectDecision(proposal, candidate, decision);
  const idempotencyKey = platformIOGenesisAdmissionIdempotencyKey(proposal);
  let attempt = await ports.findAttempt(idempotencyKey);

  if (attempt?.state === 'MUTATED' && attempt.mutationResult) {
    return commitAndBackfill(
      attempt,
      proposal,
      candidate,
      decision,
      attempt.mutationResult,
      ports,
      'MUTATION_ALREADY_RECORDED',
    );
  }

  if (attempt?.state === 'RECONCILIATION_REQUIRED') {
    throw new Error(
      `GENESIS_ADMISSION_RECONCILIATION_REQUIRED:${idempotencyKey}`,
    );
  }

  if (!attempt) {
    attempt = {
      idempotencyKey,
      proposalId: proposal.proposalId,
      candidateRef: candidate.candidateRef,
      mutation: proposal.proposalKind,
      targetCanonicalId: targetFor(proposal),
      admissionDecisionRef: decision.decisionRef,
      reservationRef: decision.reservationRef!,
      state: 'PREPARED',
    };
    await ports.prepareAttempt(attempt);
  }

  try {
    const result = await ports.performMutation({
      proposal,
      candidate,
      decision,
      idempotencyKey,
    });

    if (
      result.mutation !== proposal.proposalKind ||
      result.state !== 'PENDING_VERIFICATION'
    ) {
      throw new Error('GENESIS_ADMISSION_MUTATION_RESULT_INVALID');
    }

    await ports.markAttemptMutated(idempotencyKey, result);

    return commitAndBackfill(
      { ...attempt, state: 'MUTATED', mutationResult: result },
      proposal,
      candidate,
      decision,
      result,
      ports,
      'EFFECT_CONFIRMED',
    );
  } catch (error) {
    const inspection = await ports.inspectEffect(attempt);

    if (inspection.resolution === 'NO_EFFECT_CONFIRMED') {
      await ports.releaseReservation({
        reservationRef: decision.reservationRef!,
        decisionRef: decision.decisionRef,
        idempotencyKey,
        reason: inspection.reason ?? 'NO_EFFECT_CONFIRMED',
      });

      await ports.recordReconciliationEvidence({
        eventType: 'platformio.genesis_admission.reconciled',
        idempotencyKey,
        proposalId: proposal.proposalId,
        candidateRef: candidate.candidateRef,
        admissionDecisionRef: decision.decisionRef,
        reservationRef: decision.reservationRef!,
        effectResolution: 'NO_EFFECT_CONFIRMED',
        reservationState: 'RELEASED',
        reason: inspection.reason ?? String(error),
        recordedAt: (ports.now ?? (() => new Date()))().toISOString(),
      });

      throw error;
    }

    if (
      inspection.resolution === 'EFFECT_CONFIRMED' &&
      inspection.mutationResult
    ) {
      await ports.markAttemptMutated(idempotencyKey, inspection.mutationResult);

      return commitAndBackfill(
        { ...attempt, state: 'MUTATED', mutationResult: inspection.mutationResult },
        proposal,
        candidate,
        decision,
        inspection.mutationResult,
        ports,
        'EFFECT_CONFIRMED_DURING_RECONCILIATION',
      );
    }

    await ports.markAttemptForReconciliation(
      idempotencyKey,
      inspection.reason ?? String(error),
    );

    await ports.commitReservation({
      reservationRef: decision.reservationRef!,
      decisionRef: decision.decisionRef,
      idempotencyKey,
      reason: 'EFFECT_UNCERTAIN',
    });

    await ports.recordReconciliationEvidence({
      eventType: 'platformio.genesis_admission.reconciled',
      idempotencyKey,
      proposalId: proposal.proposalId,
      candidateRef: candidate.candidateRef,
      admissionDecisionRef: decision.decisionRef,
      reservationRef: decision.reservationRef!,
      effectResolution: 'EFFECT_UNCERTAIN',
      reservationState: 'COMMITTED',
      reason: inspection.reason ?? String(error),
      recordedAt: (ports.now ?? (() => new Date()))().toISOString(),
    });

    throw new Error(
      `GENESIS_ADMISSION_EFFECT_UNCERTAIN:${idempotencyKey}`,
    );
  }
}
