import {
  projectPlatformIOObservationToGenesisCandidates,
} from './platformioGenesisProjection';
import {
  PLATFORMIO_ADAPTER_ID,
  PLATFORMIO_PROVIDER_ID,
} from './platformioProviderContract';

const provenance = {
  requestId: 'REQ-PLATFORMIO-001',
  wardenDecisionRef: 'WARDEN-DECISION-001',
  riverEvidenceRef: 'RIVER-EVIDENCE-001',
  observedAt: '2026-09-26T00:00:00.000Z',
};

describe('PlatformIO Genesis candidate projection', () => {
  it('projects provider devices as provisional discovered-device candidates', () => {
    const candidates = projectPlatformIOObservationToGenesisCandidates(
      {
        providerId: PLATFORMIO_PROVIDER_ID,
        adapterId: PLATFORMIO_ADAPTER_ID,
        capabilityId: 'platformio.device.list',
        invocation: {
          executable: 'pio',
          args: ['device', 'list', '--json-output'],
          outputFormat: 'json',
        },
        providerExitCode: 0,
        ok: true,
        data: [
          {
            port: 'COM4',
            description: 'USB Serial Device',
            hwid: 'USB VID:PID=10C4:EA60',
          },
        ],
        stderr: '',
      },
      provenance,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: 'DISCOVERED_DEVICE',
      lifecycleStatus: 'PROVISIONAL',
      verified: false,
      canonicalGenesisDeviceId: null,
      provenance: {
        requestId: 'REQ-PLATFORMIO-001',
        wardenDecisionRef: 'WARDEN-DECISION-001',
        riverEvidenceRef: 'RIVER-EVIDENCE-001',
      },
    });
    expect(candidates[0].correlationKeys).toContain(
      'platformio:hwid:USB VID:PID=10C4:EA60',
    );
  });

  it('uses hardware identity before volatile port identity for candidate stability', () => {
    const makeObservation = (port: string) => ({
      providerId: PLATFORMIO_PROVIDER_ID,
      adapterId: PLATFORMIO_ADAPTER_ID,
      capabilityId: 'platformio.device.list',
      invocation: {
        executable: 'pio' as const,
        args: ['device', 'list', '--json-output'] as const,
        outputFormat: 'json' as const,
      },
      providerExitCode: 0,
      ok: true,
      data: [{ port, hwid: 'USB VID:PID=10C4:EA60' }],
      stderr: '',
    });

    const first = projectPlatformIOObservationToGenesisCandidates(
      makeObservation('COM4'),
      provenance,
    );
    const second = projectPlatformIOObservationToGenesisCandidates(
      makeObservation('COM7'),
      provenance,
    );

    expect(first[0].candidateRef).toBe(second[0].candidateRef);
  });

  it('projects project metadata without creating a canonical Genesis project', () => {
    const candidates = projectPlatformIOObservationToGenesisCandidates(
      {
        providerId: PLATFORMIO_PROVIDER_ID,
        adapterId: PLATFORMIO_ADAPTER_ID,
        capabilityId: 'platformio.project.inspect',
        invocation: {
          executable: 'pio',
          args: [
            'project',
            'metadata',
            '--project-dir',
            'C:/alpha/device-a',
            '--json-output',
          ],
          outputFormat: 'json',
        },
        providerExitCode: 0,
        ok: true,
        data: { name: 'device-a', envs: ['esp32dev'] },
        stderr: '',
      },
      {
        ...provenance,
        projectDir: 'C:/alpha/device-a',
      },
    );

    expect(candidates[0]).toMatchObject({
      kind: 'DISCOVERED_PROJECT',
      lifecycleStatus: 'PROVISIONAL',
      projectDir: 'C:/alpha/device-a',
      canonicalGenesisProjectId: null,
      verified: false,
    });
  });

  it('does not project failed provider observations into Genesis candidates', () => {
    const candidates = projectPlatformIOObservationToGenesisCandidates(
      {
        providerId: PLATFORMIO_PROVIDER_ID,
        adapterId: PLATFORMIO_ADAPTER_ID,
        capabilityId: 'platformio.device.list',
        invocation: {
          executable: 'pio',
          args: ['device', 'list', '--json-output'],
          outputFormat: 'json',
        },
        providerExitCode: 1,
        ok: false,
        data: [],
        stderr: 'provider error',
      },
      provenance,
    );

    expect(candidates).toEqual([]);
  });

  it('ignores observations that have no Genesis candidate projection in R0.1', () => {
    const candidates = projectPlatformIOObservationToGenesisCandidates(
      {
        providerId: PLATFORMIO_PROVIDER_ID,
        adapterId: PLATFORMIO_ADAPTER_ID,
        capabilityId: 'platformio.version',
        invocation: {
          executable: 'pio',
          args: ['--version'],
          outputFormat: 'text',
        },
        providerExitCode: 0,
        ok: true,
        data: 'PlatformIO Core, version 6.2.1b2',
        stderr: '',
      },
      provenance,
    );

    expect(candidates).toEqual([]);
  });
});
