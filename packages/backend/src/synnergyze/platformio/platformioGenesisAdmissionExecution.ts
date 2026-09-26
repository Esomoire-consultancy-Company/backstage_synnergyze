import {
  GenesisAdmissionProposal,
} from './platformioGenesisAdmission';
import {
  GenesisPlatformIOCandidate,
} from './platformioGenesisProjection';

export type GenesisAdmissionMutation =
  | 'CREATE_CANONICAL_OBJECT'
  | 'BIND_TO_EXISTING_OBJECT';

export interface GenesisAdmissionDecision {
  decisionRef: string;
  proposalId: string;
  candidateRef: string;
  mutation: GenesisAdmissionMutation;
  canonicalKind: 'DEVICE' | 'PROJECT';
  targetCanonicalId?: string;
  allowed: boolean;
  reservationRef?: string;
  expiresAt?: string;
  reason?: string;
}

export interface GenesisAdmissionMutationResult {
  canonicalId: string;
  mutationRef: string;
  mutation: GenesisAdmissionMutation;
  state: 'PENDING_VERIFICATION';
}

export interface GenesisAdmissionMutationReceipt {
  eventType: 'platformio.genesis_admission.mutated';
  proposalId: string;
  candidateRef: string;
  admissionDecisionRef: string;
  reservationRef: string;
  mutation: GenesisAdmissionMutation;
  canonicalId: string;
  mutationRef: string;
  mutationSucceeded: true;
  canonicalState: 'PENDING_VERIFICATION';
  canonicalTruthEstablished: false;
  recordedAt: string;
}

export interface PlatformIOGenesisAdmissionMutationPorts {
  authorizeAdmission: (
    proposal: GenesisAdmissionProposal,
    candidate: GenesisPlatformIOCandidate,
  ) => Promise<GenesisAdmissionDecision>;
  createCanonicalObject: (input: {
    proposal: GenesisAdmissionProposal;
    candidate: GenesisPlatformIOCandidate;
    admissionDecision: GenesisAdmissionDecision;
  }) => Promise<GenesisAdmissionMutationResult>;
  bindToExistingObject: (input: {
    proposal: GenesisAdmissionProposal;
    candidate: GenesisPlatformIOCandidate;
    admissionDecision: GenesisAdmissionDecision;
    canonicalId: string;
  }) => Promise<GenesisAdmissionMutationResult>;
  recordMutationEvidence: (
    receipt: GenesisAdmissionMutationReceipt,
  ) => Promise<void>;
  now?: () => Date;
}

function assertProposalCandidateAlignment(
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
) {
  if (proposal.candidateRef !== candidate.candidateRef) {
    throw new Error('PLATFORMIO_ADMISSION_PROPOSAL_CANDIDATE_MISMATCH');
  }

  if (proposal.status !== 'PROPOSED') {
    throw new Error('PLATFORMIO_ADMISSION_PROPOSAL_NOT_PROPOSED');
  }

  if (candidate.lifecycleStatus !== 'PROVISIONAL' || candidate.verified) {
    throw new Error('PLATFORMIO_ADMISSION_CANDIDATE_NOT_PROVISIONAL');
  }
}

function assertDecisionAlignment(
  proposal: GenesisAdmissionProposal,
  decision: GenesisAdmissionDecision,
  now: Date,
) {
  if (!decision.allowed) {
    throw new Error(
      `WARDEN_ADMISSION_DENIED:${decision.decisionRef}:${
        decision.reason ?? 'DENIED'
      }`,
    );
  }

  if (decision.proposalId !== proposal.proposalId) {
    throw new Error('WARDEN_ADMISSION_PROPOSAL_MISMATCH');
  }

  if (decision.candidateRef !== proposal.candidateRef) {
    throw new Error('WARDEN_ADMISSION_CANDIDATE_MISMATCH');
  }

  if (decision.mutation !== proposal.proposalKind) {
    throw new Error('WARDEN_ADMISSION_MUTATION_MISMATCH');
  }

  if (decision.canonicalKind !== proposal.requestedCanonicalKind) {
    throw new Error('WARDEN_ADMISSION_CANONICAL_KIND_MISMATCH');
  }

  if (!decision.reservationRef) {
    throw new Error('WARDEN_ADMISSION_RESERVATION_REQUIRED');
  }

  if (
    decision.expiresAt &&
    new Date(decision.expiresAt).getTime() <= now.getTime()
  ) {
    throw new Error(
      `WARDEN_ADMISSION_DECISION_EXPIRED:${decision.decisionRef}`,
    );
  }

  if (
    proposal.proposalKind === 'BIND_TO_EXISTING_OBJECT' &&
    (!proposal.matchedCanonicalId ||
      decision.targetCanonicalId !== proposal.matchedCanonicalId)
  ) {
    throw new Error('WARDEN_ADMISSION_TARGET_MISMATCH');
  }
}

export async function executePlatformIOGenesisAdmission(
  proposal: GenesisAdmissionProposal,
  candidate: GenesisPlatformIOCandidate,
  ports: PlatformIOGenesisAdmissionMutationPorts,
) {
  assertProposalCandidateAlignment(proposal, candidate);

  const decision = await ports.authorizeAdmission(proposal, candidate);
  const now = (ports.now ?? (() => new Date()))();

  assertDecisionAlignment(proposal, decision, now);

  let result: GenesisAdmissionMutationResult;

  if (proposal.proposalKind === 'CREATE_CANONICAL_OBJECT') {
    result = await ports.createCanonicalObject({
      proposal,
      candidate,
      admissionDecision: decision,
    });
  } else {
    result = await ports.bindToExistingObject({
      proposal,
      candidate,
      admissionDecision: decision,
      canonicalId: proposal.matchedCanonicalId!,
    });
  }

  if (
    result.mutation !== proposal.proposalKind ||
    result.state !== 'PENDING_VERIFICATION'
  ) {
    throw new Error('GENESIS_ADMISSION_MUTATION_RESULT_INVALID');
  }

  await ports.recordMutationEvidence({
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
    recordedAt: now.toISOString(),
  });

  return {
    admissionDecision: decision,
    mutation: result,
    canonicalTruthEstablished: false as const,
    verificationRequired: true as const,
  };
}
