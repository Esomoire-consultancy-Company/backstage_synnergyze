import {
  preparePlatformIOGenesisAdmission,
} from './platformioGenesisAdmission';
import {
  GenesisDiscoveredDeviceCandidate,
} from './platformioGenesisProjection';

const candidate: GenesisDiscoveredDeviceCandidate = {
  kind: 'DISCOVERED_DEVICE',
  candidateRef: 'GENESIS-CANDIDATE-DEVICE-001',
  lifecycleStatus: 'PROVISIONAL',
  providerObservation: {
    hardwareId: 'USB VID:PID=10C4:EA60',
  },
  correlationKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
  provenance: {
    providerId: 'PROVIDER-PLATFORMIO-001',
    adapterId: 'ADAPTER-PLATFORMIO-001',
    capabilityId: 'platformio.device.list',
    requestId: 'REQ-001',
    wardenDecisionRef: 'WARDEN-OBSERVE-001',
    riverEvidenceRef: 'RIVER-EVIDENCE-001',
    observedAt: '2026-09-26T04:30:00.000Z',
  },
  canonicalGenesisDeviceId: null,
  verified: false,
};

describe('PlatformIO Genesis admission preparation', () => {
  it('prepares NEW candidates as create-object proposals without performing mutation', () => {
    expect(
      preparePlatformIOGenesisAdmission(candidate, {
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
      }),
    ).toMatchObject({
      outcome: 'PROPOSAL_READY',
      proposal: {
        proposalKind: 'CREATE_CANONICAL_OBJECT',
        requestedCanonicalKind: 'DEVICE',
        wardenAdmissionRequired: true,
        canonicalMutationAuthorized: false,
        canonicalMutationPerformed: false,
        status: 'PROPOSED',
      },
    });
  });

  it('prepares a single MATCH as a bind proposal', () => {
    expect(
      preparePlatformIOGenesisAdmission(candidate, {
        candidateRef: candidate.candidateRef,
        candidateKind: candidate.kind,
        classification: 'MATCH',
        strength: 'STRONG',
        matchedCanonicalIds: ['GENESIS-DEVICE-001'],
        matchedKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
        conflictingKeys: [],
        automaticPromotionAllowed: false,
        requiresWardenAdmission: true,
        requiresManualReconciliation: false,
      }),
    ).toMatchObject({
      outcome: 'PROPOSAL_READY',
      proposal: {
        proposalKind: 'BIND_TO_EXISTING_OBJECT',
        matchedCanonicalId: 'GENESIS-DEVICE-001',
        canonicalMutationAuthorized: false,
      },
    });
  });

  it('holds AMBIGUOUS candidates for reconciliation', () => {
    expect(
      preparePlatformIOGenesisAdmission(candidate, {
        candidateRef: candidate.candidateRef,
        candidateKind: candidate.kind,
        classification: 'AMBIGUOUS',
        strength: 'WEAK',
        matchedCanonicalIds: ['GENESIS-DEVICE-001', 'GENESIS-DEVICE-002'],
        matchedKeys: ['platformio:description:USB Serial Device'],
        conflictingKeys: [],
        automaticPromotionAllowed: false,
        requiresWardenAdmission: true,
        requiresManualReconciliation: true,
      }),
    ).toMatchObject({
      outcome: 'HELD',
      hold: {
        classification: 'AMBIGUOUS',
        status: 'RECONCILIATION_REQUIRED',
        canonicalMutationAuthorized: false,
        canonicalMutationPerformed: false,
      },
    });
  });

  it('holds CONFLICT candidates and preserves conflicting identity evidence', () => {
    const result = preparePlatformIOGenesisAdmission(candidate, {
      candidateRef: candidate.candidateRef,
      candidateKind: candidate.kind,
      classification: 'CONFLICT',
      strength: 'STRONG',
      matchedCanonicalIds: ['GENESIS-DEVICE-001', 'GENESIS-DEVICE-004'],
      matchedKeys: [],
      conflictingKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
      requiresManualReconciliation: true,
    });

    expect(result).toMatchObject({
      outcome: 'HELD',
      hold: {
        classification: 'CONFLICT',
        status: 'RECONCILIATION_REQUIRED',
        conflictingKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
      },
    });
  });

  it('rejects correlation results for a different candidate', () => {
    expect(() =>
      preparePlatformIOGenesisAdmission(candidate, {
        candidateRef: 'OTHER-CANDIDATE',
        candidateKind: candidate.kind,
        classification: 'NEW',
        strength: 'NONE',
        matchedCanonicalIds: [],
        matchedKeys: [],
        conflictingKeys: [],
        automaticPromotionAllowed: false,
        requiresWardenAdmission: true,
        requiresManualReconciliation: false,
      }),
    ).toThrow('PLATFORMIO_CORRELATION_CANDIDATE_MISMATCH');
  });
});
