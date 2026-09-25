export type PlatformIOActionClass = 'OBSERVE' | 'OBSERVE_EXTERNAL';

export interface PlatformIOCapabilityContract {
  capabilityId: string;
  actionClass: PlatformIOActionClass;
  effectProducing: false;
  authorityRequired: true;
  evidenceRequired: true;
}

export const PLATFORMIO_PROVIDER_ID = 'PROVIDER-PLATFORMIO-001';
export const PLATFORMIO_ADAPTER_ID = 'ADAPTER-PLATFORMIO-001';
export const PLATFORMIO_ADAPTER_VERSION = 'R0.1';

export const PLATFORMIO_REFERENCE = {
  provider: 'PlatformIO Core',
  version: '6.2.1b2',
  snapshotDate: '2026-09-19',
  commitMarker: 'ff26956ecf0cdd44f6599894f11a83a93189e07f',
} as const;

export const PLATFORMIO_OBSERVATION_CAPABILITIES: readonly PlatformIOCapabilityContract[] = [
  { capabilityId: 'platformio.version', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.device.list', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.project.inspect', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.environment.list', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.board.list', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.package.list', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.package.outdated', actionClass: 'OBSERVE', effectProducing: false, authorityRequired: true, evidenceRequired: true },
  { capabilityId: 'platformio.remote.agent.list', actionClass: 'OBSERVE_EXTERNAL', effectProducing: false, authorityRequired: true, evidenceRequired: true },
] as const;

export const PLATFORMIO_EFFECT_CAPABILITIES_ADMITTED = false as const;

export function getPlatformIOCapability(capabilityId: string) {
  return PLATFORMIO_OBSERVATION_CAPABILITIES.find(
    capability => capability.capabilityId === capabilityId,
  );
}
