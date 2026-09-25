import {
  PlatformIONormalizedObservation,
} from './platformioObservationAdapter';

export type GenesisCandidateKind =
  | 'DISCOVERED_DEVICE'
  | 'DISCOVERED_PROJECT';

export interface GenesisCandidateProvenance {
  providerId: string;
  adapterId: string;
  capabilityId: string;
  requestId: string;
  wardenDecisionRef: string;
  riverEvidenceRef: string;
  observedAt: string;
}

export interface GenesisDiscoveredDeviceCandidate {
  kind: 'DISCOVERED_DEVICE';
  candidateRef: string;
  lifecycleStatus: 'PROVISIONAL';
  providerObservation: {
    port?: string;
    description?: string;
    hardwareId?: string;
    transport?: string;
  };
  correlationKeys: readonly string[];
  provenance: GenesisCandidateProvenance;
  canonicalGenesisDeviceId: null;
  verified: false;
}

export interface GenesisDiscoveredProjectCandidate {
  kind: 'DISCOVERED_PROJECT';
  candidateRef: string;
  lifecycleStatus: 'PROVISIONAL';
  projectDir?: string;
  providerMetadata: unknown;
  correlationKeys: readonly string[];
  provenance: GenesisCandidateProvenance;
  canonicalGenesisProjectId: null;
  verified: false;
}

export type GenesisPlatformIOCandidate =
  | GenesisDiscoveredDeviceCandidate
  | GenesisDiscoveredProjectCandidate;

export interface GenesisProjectionContext {
  requestId: string;
  wardenDecisionRef: string;
  riverEvidenceRef: string;
  observedAt: string;
  projectDir?: string;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function candidateToken(value: string): string {
  return encodeURIComponent(value.toLowerCase());
}

function deviceCorrelationKeys(device: Record<string, unknown>) {
  const port = clean(device.port);
  const description = clean(device.description);
  const hardwareId = clean(
    device.hwid ?? device.hardware_id ?? device.hardwareId,
  );

  return [
    hardwareId && `platformio:hwid:${hardwareId}`,
    port && `platformio:port:${port}`,
    description && `platformio:description:${description}`,
  ].filter((value): value is string => Boolean(value));
}

function projectCorrelationKeys(projectDir: string | undefined, data: unknown) {
  const keys: string[] = [];

  if (projectDir) {
    keys.push(`platformio:project-dir:${projectDir}`);
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const name = clean(record.name ?? record.project_name ?? record.projectName);
    if (name) {
      keys.push(`platformio:project-name:${name}`);
    }
  }

  return keys;
}

function provenance(
  observation: PlatformIONormalizedObservation,
  context: GenesisProjectionContext,
): GenesisCandidateProvenance {
  return {
    providerId: observation.providerId,
    adapterId: observation.adapterId,
    capabilityId: observation.capabilityId,
    requestId: context.requestId,
    wardenDecisionRef: context.wardenDecisionRef,
    riverEvidenceRef: context.riverEvidenceRef,
    observedAt: context.observedAt,
  };
}

export function projectPlatformIOObservationToGenesisCandidates(
  observation: PlatformIONormalizedObservation,
  context: GenesisProjectionContext,
): readonly GenesisPlatformIOCandidate[] {
  if (!observation.ok) {
    return [];
  }

  if (observation.capabilityId === 'platformio.device.list') {
    if (!Array.isArray(observation.data)) {
      throw new Error('PLATFORMIO_DEVICE_LIST_INVALID_SHAPE');
    }

    return observation.data.map((rawDevice, index) => {
      if (!rawDevice || typeof rawDevice !== 'object' || Array.isArray(rawDevice)) {
        throw new Error('PLATFORMIO_DEVICE_RECORD_INVALID_SHAPE');
      }

      const device = rawDevice as Record<string, unknown>;
      const correlationKeys = deviceCorrelationKeys(device);
      const stableSource =
        clean(device.hwid ?? device.hardware_id ?? device.hardwareId) ??
        clean(device.port) ??
        `index-${index}`;

      return {
        kind: 'DISCOVERED_DEVICE',
        candidateRef: `GENESIS-CANDIDATE-DEVICE-PLATFORMIO-${candidateToken(
          stableSource,
        )}`,
        lifecycleStatus: 'PROVISIONAL',
        providerObservation: {
          port: clean(device.port),
          description: clean(device.description),
          hardwareId: clean(
            device.hwid ?? device.hardware_id ?? device.hardwareId,
          ),
          transport: clean(device.transport ?? device.protocol),
        },
        correlationKeys,
        provenance: provenance(observation, context),
        canonicalGenesisDeviceId: null,
        verified: false,
      } satisfies GenesisDiscoveredDeviceCandidate;
    });
  }

  if (
    observation.capabilityId === 'platformio.project.inspect' ||
    observation.capabilityId === 'platformio.environment.list'
  ) {
    const correlationKeys = projectCorrelationKeys(
      context.projectDir,
      observation.data,
    );
    const stableSource =
      context.projectDir ??
      correlationKeys[0] ??
      `${observation.capabilityId}:${context.requestId}`;

    return [
      {
        kind: 'DISCOVERED_PROJECT',
        candidateRef: `GENESIS-CANDIDATE-PROJECT-PLATFORMIO-${candidateToken(
          stableSource,
        )}`,
        lifecycleStatus: 'PROVISIONAL',
        projectDir: context.projectDir,
        providerMetadata: observation.data,
        correlationKeys,
        provenance: provenance(observation, context),
        canonicalGenesisProjectId: null,
        verified: false,
      } satisfies GenesisDiscoveredProjectCandidate,
    ];
  }

  return [];
}
