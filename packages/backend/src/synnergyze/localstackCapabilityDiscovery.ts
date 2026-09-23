import type { SignalEnvelope } from './sourceTaxonomy';

export type CapabilityRuntimeState =
  | 'AVAILABLE'
  | 'RUNNING'
  | 'STOPPED'
  | 'UNKNOWN';

export interface DiscoveredCapability {
  id: string;
  family: 'aws';
  runtimeState: CapabilityRuntimeState;
  rawState?: string;
}

export interface ProviderCapabilitySnapshot {
  schemaVersion: 'synnergyze.provider-capabilities.r0.1';
  nodeId: string;
  provider: {
    id: 'localstack';
    family: 'aws';
    executionClass: 'EMULATED_LOCAL';
    endpoint: string;
    version?: string;
  };
  capabilities: DiscoveredCapability[];
  observedAt: string;
}

export interface LocalStackDiscoveryOptions {
  endpoint: string;
  nodeId: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type LocalStackHealth = {
  version?: string;
  services?: Record<string, string>;
  features?: Record<string, unknown>;
  [key: string]: unknown;
};

function normalizeState(rawState: string): CapabilityRuntimeState {
  const state = rawState.trim().toLowerCase();
  if (state === 'running' || state === 'available') {
    return state.toUpperCase() as CapabilityRuntimeState;
  }
  if (state === 'stopped' || state === 'disabled') {
    return 'STOPPED';
  }
  return 'UNKNOWN';
}

export async function discoverLocalStackCapabilities(
  options: LocalStackDiscoveryOptions,
): Promise<ProviderCapabilitySnapshot> {
  const endpoint = options.endpoint.replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${endpoint}/_localstack/health`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(options.timeoutMs ?? 3000),
  });

  if (!response.ok) {
    throw new Error(
      `LocalStack capability discovery failed with HTTP ${response.status}`,
    );
  }

  const body = (await response.json()) as LocalStackHealth;
  const services =
    body.services && typeof body.services === 'object' ? body.services : {};

  const capabilities = Object.entries(services)
    .map(([id, rawState]) => ({
      id,
      family: 'aws' as const,
      runtimeState: normalizeState(String(rawState)),
      rawState: String(rawState),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: 'synnergyze.provider-capabilities.r0.1',
    nodeId: options.nodeId,
    provider: {
      id: 'localstack',
      family: 'aws',
      executionClass: 'EMULATED_LOCAL',
      endpoint,
      version:
        response.headers.get('x-localstack') ??
        (typeof body.version === 'string' ? body.version : undefined),
    },
    capabilities,
    observedAt: new Date().toISOString(),
  };
}

export function capabilitySignalsFromSnapshot(
  snapshot: ProviderCapabilitySnapshot,
): SignalEnvelope[] {
  return snapshot.capabilities.map(capability => ({
    id: `${snapshot.provider.id}:${capability.id}:${snapshot.observedAt}`,
    domain: 'CLOUD',
    surface: 'PROVIDER_API',
    signal: 'CAPABILITY_DISCOVERED',
    signalClass: 'STATE',
    provider: {
      id: snapshot.provider.id,
      family: snapshot.provider.family,
      executionClass: snapshot.provider.executionClass,
      endpointRef: snapshot.provider.endpoint,
    },
    resourceRef: `aws-capability:${capability.id}`,
    riverEvidenceRefs: [],
    observedAt: snapshot.observedAt,
    schemaVersion: 'synnergyze.signal.r0.1',
  }));
}
