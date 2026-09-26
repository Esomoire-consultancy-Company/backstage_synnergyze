import {
  correlatePlatformIOCandidate,
  GenesisCanonicalIdentityRecord,
} from './platformioGenesisCorrelation';
import {
  GenesisDiscoveredDeviceCandidate,
  GenesisDiscoveredProjectCandidate,
} from './platformioGenesisProjection';

const provenance = {
  providerId: 'PROVIDER-PLATFORMIO-001',
  adapterId: 'ADAPTER-PLATFORMIO-001',
  capabilityId: 'platformio.device.list',
  requestId: 'REQ-001',
  wardenDecisionRef: 'WARDEN-001',
  riverEvidenceRef: 'RIVER-001',
  observedAt: '2026-09-26T04:00:00.000Z',
};

function deviceCandidate(
  keys: readonly string[],
): GenesisDiscoveredDeviceCandidate {
  return {
    kind: 'DISCOVERED_DEVICE',
    candidateRef: 'CANDIDATE-DEVICE-001',
    lifecycleStatus: 'PROVISIONAL',
    providerObservation: {},
    correlationKeys: keys,
    provenance,
    canonicalGenesisDeviceId: null,
    verified: false,
  };
}

const deviceRecords: GenesisCanonicalIdentityRecord[] = [
  {
    canonicalId: 'GENESIS-DEVICE-001',
    kind: 'DEVICE',
    correlationKeys: [
      'platformio:hwid:USB VID:PID=10C4:EA60',
      'platformio:port:COM4',
    ],
    status: 'ACTIVE',
  },
  {
    canonicalId: 'GENESIS-DEVICE-002',
    kind: 'DEVICE',
    correlationKeys: ['platformio:description:USB Serial Device'],
    status: 'ACTIVE',
  },
];

describe('PlatformIO Genesis correlation', () => {
  it('classifies an unseen identity as NEW', () => {
    expect(
      correlatePlatformIOCandidate(
        deviceCandidate(['platformio:hwid:UNSEEN']),
        deviceRecords,
      ),
    ).toMatchObject({
      classification: 'NEW',
      strength: 'NONE',
      automaticPromotionAllowed: false,
      requiresWardenAdmission: true,
    });
  });

  it('prefers hardware identity as a strong MATCH', () => {
    expect(
      correlatePlatformIOCandidate(
        deviceCandidate([
          'platformio:hwid:USB VID:PID=10C4:EA60',
          'platformio:port:COM7',
        ]),
        deviceRecords,
      ),
    ).toMatchObject({
      classification: 'MATCH',
      strength: 'STRONG',
      matchedCanonicalIds: ['GENESIS-DEVICE-001'],
      automaticPromotionAllowed: false,
    });
  });

  it('marks multiple weak matches as AMBIGUOUS', () => {
    const records = [
      ...deviceRecords,
      {
        canonicalId: 'GENESIS-DEVICE-003',
        kind: 'DEVICE' as const,
        correlationKeys: ['platformio:description:USB Serial Device'],
        status: 'ACTIVE' as const,
      },
    ];

    expect(
      correlatePlatformIOCandidate(
        deviceCandidate(['platformio:description:USB Serial Device']),
        records,
      ),
    ).toMatchObject({
      classification: 'AMBIGUOUS',
      strength: 'WEAK',
      requiresManualReconciliation: true,
    });
  });

  it('marks the same strong identity on multiple canonical records as CONFLICT', () => {
    const records = [
      ...deviceRecords,
      {
        canonicalId: 'GENESIS-DEVICE-004',
        kind: 'DEVICE' as const,
        correlationKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
        status: 'ACTIVE' as const,
      },
    ];

    expect(
      correlatePlatformIOCandidate(
        deviceCandidate(['platformio:hwid:USB VID:PID=10C4:EA60']),
        records,
      ),
    ).toMatchObject({
      classification: 'CONFLICT',
      strength: 'STRONG',
      requiresManualReconciliation: true,
    });
  });

  it('correlates projects by project directory as a strong identity key', () => {
    const project: GenesisDiscoveredProjectCandidate = {
      kind: 'DISCOVERED_PROJECT',
      candidateRef: 'CANDIDATE-PROJECT-001',
      lifecycleStatus: 'PROVISIONAL',
      projectDir: 'C:/alpha/device-a',
      providerMetadata: { name: 'device-a' },
      correlationKeys: [
        'platformio:project-dir:C:/alpha/device-a',
        'platformio:project-name:device-a',
      ],
      provenance: {
        ...provenance,
        capabilityId: 'platformio.project.inspect',
      },
      canonicalGenesisProjectId: null,
      verified: false,
    };

    expect(
      correlatePlatformIOCandidate(project, [
        {
          canonicalId: 'GENESIS-PROJECT-001',
          kind: 'PROJECT',
          correlationKeys: ['platformio:project-dir:C:/alpha/device-a'],
          status: 'ACTIVE',
        },
      ]),
    ).toMatchObject({
      classification: 'MATCH',
      strength: 'STRONG',
      matchedCanonicalIds: ['GENESIS-PROJECT-001'],
    });
  });
});
