import {
  GenesisCorrelationResult,
} from './platformioGenesisCorrelation';
import {
  GenesisPlatformIOCandidate,
} from './platformioGenesisProjection';

export type GenesisAdmissionProposalKind =
  | 'CREATE_CANONICAL_OBJECT'
  | 'BIND_TO_EXISTING_OBJECT';

export interface GenesisAdmissionProposal {
  proposalId: string;
  source: 'PLATFORMIO';
  candidateRef: string;
  candidateKind: GenesisPlatformIOCandidate['kind'];
  proposalKind: GenesisAdmissionProposalKind;
  requestedCanonicalKind: 'DEVICE' | 'PROJECT';
  matchedCanonicalId?: string;
  correlationClassification: 'NEW' | 'MATCH';
  correlationStrength: 'STRONG' | 'WEAK' | 'NONE';
  wardenAdmissionRequired: true;
  riverEvidenceRefs: readonly string[];
  sourceWardenDecisionRef: string;
  sourceRequestId: string;
  canonicalMutationAuthorized: false;
  canonicalMutationPerformed: false;
  status: 'PROPOSED';
}

export interface GenesisAdmissionHold {
  candidateRef: string;
  classification: 'AMBIGUOUS' | 'CONFLICT';
  status: 'RECONCILIATION_REQUIRED';
  matchedCanonicalIds: readonly string[];
  matchedKeys: readonly string[];
  conflictingKeys: readonly string[];
  canonicalMutationAuthorized: false;
  canonicalMutationPerformed: false;
}

export type GenesisAdmissionPreparation =
  | {
      outcome: 'PROPOSAL_READY';
      proposal: GenesisAdmissionProposal;
    }
  | {
      outcome: 'HELD';
      hold: GenesisAdmissionHold;
    };

function canonicalKindFor(candidate: GenesisPlatformIOCandidate) {
  return candidate.kind === 'DISCOVERED_DEVICE' ? 'DEVICE' : 'PROJECT';
}

function proposalToken(candidateRef: string) {
  return encodeURIComponent(candidateRef.toLowerCase());
}

export function preparePlatformIOGenesisAdmission(
  candidate: GenesisPlatformIOCandidate,
  correlation: GenesisCorrelationResult,
): GenesisAdmissionPreparation {
  if (candidate.candidateRef !== correlation.candidateRef) {
    throw new Error('PLATFORMIO_CORRELATION_CANDIDATE_MISMATCH');
  }

  if (
    correlation.classification === 'AMBIGUOUS' ||
    correlation.classification === 'CONFLICT'
  ) {
    return {
      outcome: 'HELD',
      hold: {
        candidateRef: candidate.candidateRef,
        classification: correlation.classification,
        status: 'RECONCILIATION_REQUIRED',
        matchedCanonicalIds: correlation.matchedCanonicalIds,
        matchedKeys: correlation.matchedKeys,
        conflictingKeys: correlation.conflictingKeys,
        canonicalMutationAuthorized: false,
        canonicalMutationPerformed: false,
      },
    };
  }

  if (
    correlation.classification === 'MATCH' &&
    correlation.matchedCanonicalIds.length !== 1
  ) {
    throw new Error('PLATFORMIO_MATCH_REQUIRES_SINGLE_CANONICAL_ID');
  }

  const proposalKind: GenesisAdmissionProposalKind =
    correlation.classification === 'NEW'
      ? 'CREATE_CANONICAL_OBJECT'
      : 'BIND_TO_EXISTING_OBJECT';

  return {
    outcome: 'PROPOSAL_READY',
    proposal: {
      proposalId: `GENESIS-ADMISSION-PROPOSAL-PLATFORMIO-${proposalToken(
        candidate.candidateRef,
      )}`,
      source: 'PLATFORMIO',
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      proposalKind,
      requestedCanonicalKind: canonicalKindFor(candidate),
      matchedCanonicalId:
        correlation.classification === 'MATCH'
          ? correlation.matchedCanonicalIds[0]
          : undefined,
      correlationClassification: correlation.classification,
      correlationStrength: correlation.strength,
      wardenAdmissionRequired: true,
      riverEvidenceRefs: [candidate.provenance.riverEvidenceRef],
      sourceWardenDecisionRef: candidate.provenance.wardenDecisionRef,
      sourceRequestId: candidate.provenance.requestId,
      canonicalMutationAuthorized: false,
      canonicalMutationPerformed: false,
      status: 'PROPOSED',
    },
  };
}
