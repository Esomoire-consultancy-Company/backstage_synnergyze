import {
  PlatformIOInvocation,
} from './platformioObservationAdapter';

export interface PlatformIORuntimeBinding {
  runtimeRef: string;
  executablePath: string;
  bindingSource: 'GENESIS_PROVIDER_BINDING' | 'ALPHA_PROVIDER_CONFIG';
  providerRootRef?: string;
  runtimeSha256?: string;
}

export interface PlatformIOBoundInvocation
  extends Omit<PlatformIOInvocation, 'executable'> {
  executable: string;
  logicalExecutable: 'pio';
  runtimeRef: string;
  runtimeSha256?: string;
}

function requireNonEmpty(value: string, field: string) {
  if (!value || value.includes('\0')) {
    throw new Error(`PLATFORMIO_RUNTIME_BINDING_INVALID:${field}`);
  }
}

export function bindPlatformIOInvocation(
  invocation: PlatformIOInvocation,
  binding: PlatformIORuntimeBinding,
): PlatformIOBoundInvocation {
  if (invocation.executable !== 'pio') {
    throw new Error('PLATFORMIO_LOGICAL_EXECUTABLE_INVALID');
  }

  requireNonEmpty(binding.runtimeRef, 'runtimeRef');
  requireNonEmpty(binding.executablePath, 'executablePath');

  return {
    executable: binding.executablePath,
    logicalExecutable: 'pio',
    args: invocation.args,
    outputFormat: invocation.outputFormat,
    runtimeRef: binding.runtimeRef,
    runtimeSha256: binding.runtimeSha256,
  };
}
