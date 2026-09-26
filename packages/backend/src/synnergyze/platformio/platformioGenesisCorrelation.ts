import {
  GenesisPlatformIOCandidate,
} from './platformioGenesisProjection';

export type GenesisCorrelationClassification =
  | 'NEW'
  | 'MATCH'
  | 'AMBIGUOUS'
  | 'CONFLICT';

export type GenesisCorrelationStrength = 'STRONG' | 'WEAK' | 'NONE';

export interface GenesisCanonicalIdentityRecord {
  canonicalId: string;
  kind: 'DEVICE' | 'PROJECT';
  correlationKeys: readonly string[];
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
}

export interface GenesisCorrelationResult {
  candidateRef: string;
  candidateKind: GenesisPlatformIOCandidate['kind'];
  classification: GenesisCorrelationClassification;
  strength: GenesisCorrelationStrength;
  matchedCanonicalIds: readonly string[];
  matchedKeys: readonly string[];
  conflictingKeys: readonly string[];
  automaticPromotionAllowed: false;
  requiresWardenAdmission: true;
  requiresManualReconciliation: boolean;
}

function canonicalKindFor(candidate: GenesisPlatformIOCandidate) {
  return candidate.kind === 'DISCOVERED_DEVICE' ? 'DEVICE' : 'PROJECT';
}

function isStrongKey(key: string) {
  return (
    key.startsWith('platformio:hwid:') ||
    key.startsWith('platformio:project-dir:')
  );
}

function intersect(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter(value => rightSet.has(value));
}

export function correlatePlatformIOCandidate(
  candidate: GenesisPlatformIOCandidate,
  canonicalRecords: readonly GenesisCanonicalIdentityRecord[],
): GenesisCorrelationResult {
  const relevant = canonicalRecords.filter(
    record => record.kind === canonicalKindFor(candidate),
  );

  const matches = relevant
    .map(record => ({
      record,
      keys: intersect(candidate.correlationKeys, record.correlationKeys),
    }))
    .filter(entry => entry.keys.length > 0);

  if (matches.length === 0) {
    return {
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      classification: 'NEW',
      strength: 'NONE',
      matchedCanonicalIds: [],
      matchedKeys: [],
      conflictingKeys: [],
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
      requiresManualReconciliation: false,
    };
  }

  const strongMatches = matches.filter(entry =>
    entry.keys.some(isStrongKey),
  );

  if (strongMatches.length > 1) {
    const strongKeys = strongMatches.flatMap(entry =>
      entry.keys.filter(isStrongKey),
    );

    return {
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      classification: 'CONFLICT',
      strength: 'STRONG',
      matchedCanonicalIds: strongMatches.map(entry => entry.record.canonicalId),
      matchedKeys: [],
      conflictingKeys: [...new Set(strongKeys)],
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
      requiresManualReconciliation: true,
    };
  }

  if (strongMatches.length === 1) {
    const strongRecord = strongMatches[0];
    const contradictoryStrongMatches = relevant
      .filter(record => record.canonicalId !== strongRecord.record.canonicalId)
      .map(record => ({
        record,
        keys: intersect(
          candidate.correlationKeys.filter(isStrongKey),
          record.correlationKeys,
        ),
      }))
      .filter(entry => entry.keys.length > 0);

    if (contradictoryStrongMatches.length > 0) {
      return {
        candidateRef: candidate.candidateRef,
        candidateKind: candidate.kind,
        classification: 'CONFLICT',
        strength: 'STRONG',
        matchedCanonicalIds: [
          strongRecord.record.canonicalId,
          ...contradictoryStrongMatches.map(entry => entry.record.canonicalId),
        ],
        matchedKeys: [],
        conflictingKeys: [
          ...new Set([
            ...strongRecord.keys.filter(isStrongKey),
            ...contradictoryStrongMatches.flatMap(entry => entry.keys),
          ]),
        ],
        automaticPromotionAllowed: false,
        requiresWardenAdmission: true,
        requiresManualReconciliation: true,
      };
    }

    return {
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      classification: 'MATCH',
      strength: 'STRONG',
      matchedCanonicalIds: [strongRecord.record.canonicalId],
      matchedKeys: strongRecord.keys,
      conflictingKeys: [],
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
      requiresManualReconciliation: false,
    };
  }

  if (matches.length === 1) {
    return {
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      classification: 'MATCH',
      strength: 'WEAK',
      matchedCanonicalIds: [matches[0].record.canonicalId],
      matchedKeys: matches[0].keys,
      conflictingKeys: [],
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
      requiresManualReconciliation: false,
    };
  }

  return {
    candidateRef: candidate.candidateRef,
    candidateKind: candidate.kind,
    classification: 'AMBIGUOUS',
    strength: 'WEAK',
    matchedCanonicalIds: matches.map(entry => entry.record.canonicalId),
    matchedKeys: [...new Set(matches.flatMap(entry => entry.keys))],
    conflictingKeys: [],
    automaticPromotionAllowed: false,
    requiresWardenAdmission: true,
    requiresManualReconciliation: true,
  };
}
