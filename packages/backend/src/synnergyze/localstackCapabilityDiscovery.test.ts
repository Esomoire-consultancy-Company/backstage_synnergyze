import {
  capabilitySignalsFromSnapshot,
  discoverLocalStackCapabilities,
} from './localstackCapabilityDiscovery';

describe('LocalStack capability discovery', () => {
  it('normalizes provider health into capability state', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: '4.8.0',
          services: {
            s3: 'running',
            sqs: 'available',
            lambda: 'disabled',
          },
        }),
        {
          status: 200,
          headers: { 'x-localstack': '4.8.0' },
        },
      ),
    ) as unknown as typeof fetch;

    const snapshot = await discoverLocalStackCapabilities({
      endpoint: 'http://localhost.localstack.cloud:4566/',
      nodeId: 'ALPHA-NODE-001',
      fetchImpl,
    });

    expect(snapshot.provider.executionClass).toBe('EMULATED_LOCAL');
    expect(snapshot.provider.family).toBe('aws');
    expect(snapshot.capabilities).toEqual([
      expect.objectContaining({ id: 'lambda', runtimeState: 'STOPPED' }),
      expect.objectContaining({ id: 's3', runtimeState: 'RUNNING' }),
      expect.objectContaining({ id: 'sqs', runtimeState: 'AVAILABLE' }),
    ]);
  });

  it('emits canonical CLOUD / PROVIDER_API signals', () => {
    const observedAt = '2026-09-23T10:00:00.000Z';
    const signals = capabilitySignalsFromSnapshot({
      schemaVersion: 'synnergyze.provider-capabilities.r0.1',
      nodeId: 'ALPHA-NODE-001',
      provider: {
        id: 'localstack',
        family: 'aws',
        executionClass: 'EMULATED_LOCAL',
        endpoint: 'http://localhost.localstack.cloud:4566',
      },
      capabilities: [
        {
          id: 's3',
          family: 'aws',
          runtimeState: 'RUNNING',
          rawState: 'running',
        },
      ],
      observedAt,
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      domain: 'CLOUD',
      surface: 'PROVIDER_API',
      signal: 'CAPABILITY_DISCOVERED',
      signalClass: 'STATE',
      provider: {
        id: 'localstack',
        family: 'aws',
        executionClass: 'EMULATED_LOCAL',
      },
      resourceRef: 'aws-capability:s3',
      schemaVersion: 'synnergyze.signal.r0.1',
    });
  });

  it('fails explicitly when provider health is unavailable', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(new Response('unavailable', { status: 503 })) as unknown as typeof fetch;

    await expect(
      discoverLocalStackCapabilities({
        endpoint: 'http://localhost.localstack.cloud:4566',
        nodeId: 'ALPHA-NODE-001',
        fetchImpl,
      }),
    ).rejects.toThrow('HTTP 503');
  });
});
