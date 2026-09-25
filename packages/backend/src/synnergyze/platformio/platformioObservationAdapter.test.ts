import {
  buildPlatformIOObservationInvocation,
  normalizePlatformIOObservation,
  observePlatformIO,
} from './platformioObservationAdapter';

describe('PlatformIO observation adapter', () => {
  it('maps device discovery to JSON output', () => {
    expect(
      buildPlatformIOObservationInvocation({
        capabilityId: 'platformio.device.list',
      }),
    ).toEqual({
      executable: 'pio',
      args: ['device', 'list', '--json-output'],
      outputFormat: 'json',
    });
  });

  it('requires explicit project scope for project-derived observations', () => {
    expect(() =>
      buildPlatformIOObservationInvocation({
        capabilityId: 'platformio.project.inspect',
      }),
    ).toThrow('PLATFORMIO_PROJECT_DIR_REQUIRED');
  });

  it('does not admit upload or arbitrary CLI execution', () => {
    expect(() =>
      buildPlatformIOObservationInvocation({
        capabilityId: 'platformio.upload',
        projectDir: '/workspace/device',
      }),
    ).toThrow('PLATFORMIO_CAPABILITY_NOT_ADMITTED');

    expect(() =>
      buildPlatformIOObservationInvocation({
        capabilityId: 'platformio.exec',
      }),
    ).toThrow('PLATFORMIO_CAPABILITY_NOT_ADMITTED');
  });

  it('normalizes provider JSON without promoting it to verified Genesis truth', () => {
    const invocation = buildPlatformIOObservationInvocation({
      capabilityId: 'platformio.device.list',
    });

    expect(
      normalizePlatformIOObservation(
        { capabilityId: 'platformio.device.list' },
        invocation,
        {
          exitCode: 0,
          stdout: '[{"port":"COM4","description":"Example"}]',
          stderr: '',
        },
      ),
    ).toMatchObject({
      capabilityId: 'platformio.device.list',
      providerExitCode: 0,
      ok: true,
      data: [{ port: 'COM4', description: 'Example' }],
    });
  });

  it('keeps command execution injectable for Warden/River wrapping', async () => {
    const result = await observePlatformIO(
      { capabilityId: 'platformio.version' },
      async invocation => ({
        exitCode: 0,
        stdout: invocation.args.join(' '),
        stderr: '',
      }),
    );

    expect(result.data).toBe('--version');
  });
});
