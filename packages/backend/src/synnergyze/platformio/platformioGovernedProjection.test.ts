import { observeAndProjectPlatformIO } from './platformioGovernedProjection';

describe('PlatformIO governed Genesis projection pipeline', () => {
  it('stores only provisional candidates after Warden-authorized observation', async () => {
    const stored: unknown[] = [];
    const projectionReceipts: unknown[] = [];

    const result = await observeAndProjectPlatformIO(
      'REQ-PROJECTION-001',
      { capabilityId: 'platformio.device.list' },
      {
        principalId: 'DIGITALME-001',
        purpose: 'device discovery',
      },
      {
        authorize: async () => ({
          decisionRef: 'WARDEN-DECISION-101',
          allowed: true,
        }),
        run: async () => ({
          exitCode: 0,
          stdout: JSON.stringify([
            {
              port: 'COM4',
              description: 'USB Serial Device',
              hwid: 'USB VID:PID=10C4:EA60',
            },
          ]),
          stderr: '',
        }),
        recordEvidence: async () => undefined,
        riverEvidenceRefFor: async () => 'RIVER-EVIDENCE-101',
        candidateStore: {
          upsertCandidate: async candidate => {
            stored.push(candidate);
            return {
              candidateRef: candidate.candidateRef,
              created: true,
            };
          },
        },
        recordProjectionEvidence: async receipt => {
          projectionReceipts.push(receipt);
        },
        now: () => new Date('2026-09-26T00:15:00.000Z'),
      },
    );

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      kind: 'DISCOVERED_DEVICE',
      lifecycleStatus: 'PROVISIONAL',
      verified: false,
      canonicalGenesisDeviceId: null,
    });
    expect(projectionReceipts[0]).toMatchObject({
      eventType: 'platformio.genesis_candidate.projected',
      lifecycleStatus: 'PROVISIONAL',
      canonicalObjectCreated: false,
    });
    expect(result.canonicalTruthEstablished).toBe(false);
    expect(result.canonicalObjectCreated).toBe(false);
  });

  it('creates no candidate when provider observation fails', async () => {
    const upsertCandidate = jest.fn();

    const result = await observeAndProjectPlatformIO(
      'REQ-PROJECTION-002',
      { capabilityId: 'platformio.device.list' },
      {
        principalId: 'DIGITALME-001',
        purpose: 'device discovery',
      },
      {
        authorize: async () => ({
          decisionRef: 'WARDEN-DECISION-102',
          allowed: true,
        }),
        run: async () => ({
          exitCode: 1,
          stdout: '[]',
          stderr: 'provider failed',
        }),
        recordEvidence: async () => undefined,
        riverEvidenceRefFor: async () => 'RIVER-EVIDENCE-102',
        candidateStore: { upsertCandidate },
        recordProjectionEvidence: async () => undefined,
      },
    );

    expect(upsertCandidate).not.toHaveBeenCalled();
    expect(result.candidates).toEqual([]);
  });

  it('cannot project an unadmitted effect capability', async () => {
    const run = jest.fn();

    await expect(
      observeAndProjectPlatformIO(
        'REQ-PROJECTION-003',
        {
          capabilityId: 'platformio.upload',
          projectDir: 'C:/alpha/device-a',
        },
        {
          principalId: 'DIGITALME-001',
          purpose: 'firmware upload',
        },
        {
          authorize: async () => ({
            decisionRef: 'WARDEN-DECISION-103',
            allowed: true,
          }),
          run,
          recordEvidence: async () => undefined,
          riverEvidenceRefFor: async () => 'RIVER-EVIDENCE-103',
          candidateStore: {
            upsertCandidate: async candidate => ({
              candidateRef: candidate.candidateRef,
              created: true,
            }),
          },
          recordProjectionEvidence: async () => undefined,
        },
      ),
    ).rejects.toThrow('PLATFORMIO_CAPABILITY_NOT_ADMITTED');

    expect(run).not.toHaveBeenCalled();
  });
});
