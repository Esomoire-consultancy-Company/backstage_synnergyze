import {
  qualifyPlatformIOGenesisCandidate,
} from './platformioGenesisQualificationService';
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
    observedAt: '2026-09-26T05:00:00.000Z',
  },
  canonicalGenesisDeviceId: null,
  verified: false,
};

describe('PlatformIO Genesis qualification service', () => {
  it('persists a proposal for a NEW candidate and no hold', async () => {
    const proposals: unknown[] = [];
    const holds: unknown[] = [];
    const receipts: unknown[] = [];

    const result = await qualifyPlatformIOGenesisCandidate(candidate, {
      store: {
        findCanonicalByKind: async () => [],
        saveAdmissionProposal: async proposal => {
          proposals.push(proposal);
        },
        saveReconciliationHold: async hold => {
          holds.push(hold);
        },
      },
      recordEvidence: async receipt => {
        receipts.push(receipt);
      },
      now: () => new Date('2026-09-26T05:01:00.000Z'),
    });

    expect(proposals).toHaveLength(1);
    expect(holds).toHaveLength(0);
    expect(result.correlation.classification).toBe('NEW');
    expect(result.canonicalMutationPerformed).toBe(false);
    expect(receipts[0]).toMatchObject({
      classification: 'NEW',
      outcome: 'PROPOSAL_READY',
      canonicalMutationPerformed: false,
    });
  });

  it('persists a reconciliation hold for conflicting strong identity', async () => {
    const proposals: unknown[] = [];
    const holds: unknown[] = [];

    const result = await qualifyPlatformIOGenesisCandidate(candidate, {
      store: {
        findCanonicalByKind: async () => [
          {
            canonicalId: 'GENESIS-DEVICE-001',
            kind: 'DEVICE',
            correlationKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
            status: 'ACTIVE',
          },
          {
            canonicalId: 'GENESIS-DEVICE-002',
            kind: 'DEVICE',
            correlationKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
            status: 'ACTIVE',
          },
        ],
        saveAdmissionProposal: async proposal => {
          proposals.push(proposal);
        },
        saveReconciliationHold: async hold => {
          holds.push(hold);
        },
      },
      recordEvidence: async () => undefined,
    });

    expect(proposals).toHaveLength(0);
    expect(holds).toHaveLength(1);
    expect(result.correlation.classification).toBe('CONFLICT');
    expect(result.preparation.outcome).toBe('HELD');
  });

  it('rejects a candidate that has already left provisional state semantics', async () => {
    await expect(
      qualifyPlatformIOGenesisCandidate(
        {
          ...candidate,
          verified: true as never,
        },
        {
          store: {
            findCanonicalByKind: async () => [],
            saveAdmissionProposal: async () => undefined,
            saveReconciliationHold: async () => undefined,
          },
          recordEvidence: async () => undefined,
        },
      ),
    ).rejects.toThrow('PLATFORMIO_CANDIDATE_NOT_PROVISIONAL');
  });
});
