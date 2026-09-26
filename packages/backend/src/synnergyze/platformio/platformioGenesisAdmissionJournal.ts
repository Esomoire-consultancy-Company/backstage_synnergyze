import {
  GenesisAdmissionAttempt,
  GenesisEffectResolution,
} from './platformioGenesisAdmissionReconciliation';
import {
  GenesisAdmissionMutationResult,
} from './platformioGenesisAdmissionExecution';

export type GenesisAdmissionJournalState =
  | 'PREPARED'
  | 'MUTATED'
  | 'RECONCILIATION_REQUIRED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'CLOSED_NO_EFFECT';

export interface GenesisAdmissionJournalEntry {
  idempotencyKey: string;
  proposalId: string;
  candidateRef: string;
  admissionDecisionRef: string;
  reservationRef: string;
  state: GenesisAdmissionJournalState;
  mutationResult?: GenesisAdmissionMutationResult;
  effectResolution?: GenesisEffectResolution;
  mutationEvidenceRecorded: boolean;
  verificationEvidenceRecorded: boolean;
  reservationTerminalState?: 'COMMITTED' | 'RELEASED';
  verificationRef?: string;
  canonicalTruthEstablished: boolean;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenesisAdmissionJournalStore {
  get: (idempotencyKey: string) => Promise<GenesisAdmissionJournalEntry | undefined>;
  putIfAbsent: (entry: GenesisAdmissionJournalEntry) => Promise<GenesisAdmissionJournalEntry>;
  update: (
    idempotencyKey: string,
    mutate: (current: GenesisAdmissionJournalEntry) => GenesisAdmissionJournalEntry,
  ) => Promise<GenesisAdmissionJournalEntry>;
  scanIncomplete: (input: {
    olderThan: string;
    limit: number;
  }) => Promise<readonly GenesisAdmissionJournalEntry[]>;
}

export function newGenesisAdmissionJournalEntry(
  attempt: GenesisAdmissionAttempt,
  now: Date,
): GenesisAdmissionJournalEntry {
  const timestamp = now.toISOString();

  return {
    idempotencyKey: attempt.idempotencyKey,
    proposalId: attempt.proposalId,
    candidateRef: attempt.candidateRef,
    admissionDecisionRef: attempt.admissionDecisionRef,
    reservationRef: attempt.reservationRef,
    state: attempt.state,
    mutationResult: attempt.mutationResult,
    mutationEvidenceRecorded: false,
    verificationEvidenceRecorded: false,
    canonicalTruthEstablished: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function assertJournalTransition(
  from: GenesisAdmissionJournalState,
  to: GenesisAdmissionJournalState,
) {
  const allowed: Record<GenesisAdmissionJournalState, readonly GenesisAdmissionJournalState[]> = {
    PREPARED: [
      'MUTATED',
      'RECONCILIATION_REQUIRED',
      'CLOSED_NO_EFFECT',
    ],
    MUTATED: [
      'VERIFICATION_PENDING',
      'RECONCILIATION_REQUIRED',
    ],
    RECONCILIATION_REQUIRED: [
      'MUTATED',
      'VERIFICATION_PENDING',
      'CLOSED_NO_EFFECT',
    ],
    VERIFICATION_PENDING: [
      'VERIFIED',
      'RECONCILIATION_REQUIRED',
    ],
    VERIFIED: [],
    CLOSED_NO_EFFECT: [],
  };

  if (from === to) {
    return;
  }

  if (!allowed[from].includes(to)) {
    throw new Error(`INVALID_GENESIS_ADMISSION_JOURNAL_TRANSITION:${from}->${to}`);
  }
}
