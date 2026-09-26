import {
  bindPlatformIOInvocation,
} from './platformioRuntimeBinding';

describe('PlatformIO runtime binding', () => {
  it('replaces logical pio with the governed provider executable', () => {
    expect(
      bindPlatformIOInvocation(
        {
          executable: 'pio',
          args: ['--version'],
          outputFormat: 'text',
        },
        {
          runtimeRef: 'PLATFORMIO-RUNTIME-ALPHA-001',
          executablePath: '/alpha/providers/platformio/venv/bin/pio',
          bindingSource: 'ALPHA_PROVIDER_CONFIG',
          runtimeSha256: 'abc123',
        },
      ),
    ).toEqual({
      executable: '/alpha/providers/platformio/venv/bin/pio',
      logicalExecutable: 'pio',
      args: ['--version'],
      outputFormat: 'text',
      runtimeRef: 'PLATFORMIO-RUNTIME-ALPHA-001',
      runtimeSha256: 'abc123',
    });
  });

  it('rejects an empty runtime executable path', () => {
    expect(() =>
      bindPlatformIOInvocation(
        {
          executable: 'pio',
          args: ['--version'],
          outputFormat: 'text',
        },
        {
          runtimeRef: 'PLATFORMIO-RUNTIME-ALPHA-001',
          executablePath: '',
          bindingSource: 'GENESIS_PROVIDER_BINDING',
        },
      ),
    ).toThrow('PLATFORMIO_RUNTIME_BINDING_INVALID:executablePath');
  });
});
