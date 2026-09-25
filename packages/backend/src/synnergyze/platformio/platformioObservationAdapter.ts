import {
  getPlatformIOCapability,
  PLATFORMIO_ADAPTER_ID,
  PLATFORMIO_PROVIDER_ID,
} from './platformioProviderContract';

export interface PlatformIOObservationRequest {
  capabilityId: string;
  projectDir?: string;
}

export interface PlatformIOInvocation {
  executable: 'pio';
  args: readonly string[];
  outputFormat: 'json' | 'text';
}

export interface PlatformIOCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface PlatformIONormalizedObservation {
  providerId: typeof PLATFORMIO_PROVIDER_ID;
  adapterId: typeof PLATFORMIO_ADAPTER_ID;
  capabilityId: string;
  invocation: PlatformIOInvocation;
  providerExitCode: number;
  ok: boolean;
  data: unknown;
  stderr: string;
}

const PROJECT_SCOPED = new Set([
  'platformio.project.inspect',
  'platformio.environment.list',
  'platformio.package.list',
  'platformio.package.outdated',
]);

export function buildPlatformIOObservationInvocation(
  request: PlatformIOObservationRequest,
): PlatformIOInvocation {
  if (!getPlatformIOCapability(request.capabilityId)) {
    throw new Error(`PLATFORMIO_CAPABILITY_NOT_ADMITTED:${request.capabilityId}`);
  }

  if (PROJECT_SCOPED.has(request.capabilityId) && !request.projectDir) {
    throw new Error('PLATFORMIO_PROJECT_DIR_REQUIRED');
  }

  const project = request.projectDir
    ? ['--project-dir', request.projectDir]
    : [];

  switch (request.capabilityId) {
    case 'platformio.version':
      return { executable: 'pio', args: ['--version'], outputFormat: 'text' };
    case 'platformio.device.list':
      return {
        executable: 'pio',
        args: ['device', 'list', '--json-output'],
        outputFormat: 'json',
      };
    case 'platformio.project.inspect':
      return {
        executable: 'pio',
        args: ['project', 'metadata', ...project, '--json-output'],
        outputFormat: 'json',
      };
    case 'platformio.environment.list':
      return {
        executable: 'pio',
        args: ['project', 'config', ...project, '--json-output'],
        outputFormat: 'json',
      };
    case 'platformio.board.list':
      return {
        executable: 'pio',
        args: ['boards', '--json-output'],
        outputFormat: 'json',
      };
    case 'platformio.package.list':
      return {
        executable: 'pio',
        args: ['pkg', 'list', ...project],
        outputFormat: 'text',
      };
    case 'platformio.package.outdated':
      return {
        executable: 'pio',
        args: ['pkg', 'outdated', ...project],
        outputFormat: 'text',
      };
    case 'platformio.remote.agent.list':
      return {
        executable: 'pio',
        args: ['remote', 'agent', 'list'],
        outputFormat: 'text',
      };
    default:
      throw new Error(`PLATFORMIO_CAPABILITY_NOT_MAPPED:${request.capabilityId}`);
  }
}

export function normalizePlatformIOObservation(
  request: PlatformIOObservationRequest,
  invocation: PlatformIOInvocation,
  result: PlatformIOCommandResult,
): PlatformIONormalizedObservation {
  let data: unknown = result.stdout.trim();

  if (invocation.outputFormat === 'json' && result.stdout.trim()) {
    try {
      data = JSON.parse(result.stdout);
    } catch {
      throw new Error('PLATFORMIO_PROVIDER_INVALID_JSON');
    }
  }

  return {
    providerId: PLATFORMIO_PROVIDER_ID,
    adapterId: PLATFORMIO_ADAPTER_ID,
    capabilityId: request.capabilityId,
    invocation,
    providerExitCode: result.exitCode,
    ok: result.exitCode === 0,
    data,
    stderr: result.stderr,
  };
}

export async function observePlatformIO(
  request: PlatformIOObservationRequest,
  run: (invocation: PlatformIOInvocation) => Promise<PlatformIOCommandResult>,
) {
  const invocation = buildPlatformIOObservationInvocation(request);
  const result = await run(invocation);
  return normalizePlatformIOObservation(request, invocation, result);
}
