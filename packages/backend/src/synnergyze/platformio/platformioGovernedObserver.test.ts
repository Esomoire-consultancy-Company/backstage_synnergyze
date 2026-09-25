import { observePlatformIOGoverned } from './platformioGovernedObserver';

describe('governed PlatformIO observation', () => {
  it('never invokes PlatformIO when Warden denies the request', async () => {
    const run = jest.fn();

    await expect(
      observePlatformIOGoverned(
        'REQ-001',
        { capabilityId: 'platformio.version' },
        { principalId: 'DIGITALME-001', purpose: 'inventory' },
        {
          authorize: async () => ({
            decisionRef: 'WARDEN-DECISION-001',
            allowed: false,
            reason: 'OUT_OF_SCOPE',
          }),
          run,
          recordEvidence: async () => undefined,
        },
      ),
    ).rejects.toThrow('WARDEN_DENIED:WARDEN-DECISION-001:OUT_OF_SCOPE');

    expect(run).not.toHaveBeenCalled();
  });

  it('rejects an expired authority decision before provider execution', async () => {
    const run = jest.fn();

    await expect(
      observePlatformIOGoverned(
        'REQ-002',
        { capabilityId: 'platformio.version' },
        { principalId: 'DIGITALME-001', purpose: 'inventory' },
        {
          authorize: async () => ({
            decisionRef: 'WARDEN-DECISION-002',
            allowed: true,
            expiresAt: '2026-09-25T00:00:00.000Z',
          }),
          run,
          recordEvidence: async () => undefined,
          now: () => new Date('2026-09-25T01:00:00.000Z'),
        },
      ),
    ).rejects.toThrow('WARDEN_DECISION_EXPIRED:WARDEN-DECISION-002');

    expect(run).not.toHaveBeenCalled();
  });

  it('records River-compatible evidence after authorized observation', async () => {
    const receipts: unknown[] = [];

    const result = await observePlatformIOGoverned(
      'REQ-003',
      { capabilityId: 'platformio.version' },
      { principalId: 'DIGITALME-001', purpose: 'inventory' },
      {
        authorize: async () => ({
          decisionRef: 'WARDEN-DECISION-003',
          allowed: true,
        }),
        run: async () => ({
          exitCode: 0,
          stdout: 'PlatformIO Core, version 6.2.1b2',
          stderr: '',
        }),
        recordEvidence: async receipt => {
          receipts.push(receipt);
        },
        now: () => new Date('2026-09-25T04:30:00.000Z'),
      },
    );

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      eventType: 'platformio.observation.completed',
      requestId: 'REQ-003',
      decisionRef: 'WARDEN-DECISION-003',
      providerObservedSuccess: true,
    });
    expect(result.canonicalTruthEstablished).toBe(false);
  });
});
