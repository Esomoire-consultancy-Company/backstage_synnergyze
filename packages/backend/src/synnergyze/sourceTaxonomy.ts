/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * Synnergyze Source Registry R0.1
 *
 * Domain = the reality being observed.
 * Surface = where the observation/execution occurred.
 * Signal = what actually happened.
 *
 * Provider-native systems remain authoritative for provider execution truth.
 * Warden owns authority decisions. River owns evidence/observation records.
 * Synnergyze only normalizes and orchestrates these references.
 */

export const SOURCE_DOMAINS = [
  'AI',
  'CLOUD',
  'COMMERCE',
  'PAYMENTS',
  'MOBILE',
  'TELECOM',
  'APP_DATA',
  'IDENTITY_ACCESS',
  'DEVICE_EDGE',
  'LOCATION_PRESENCE',
  'MEDIA_CONTENT',
  'MESSAGING_COMMUNICATIONS',
  'LOGISTICS_FULFILMENT',
  'ENTERPRISE_SYSTEMS',
  'IOT_SENSORS',
] as const;

export type SourceDomain = (typeof SOURCE_DOMAINS)[number];

export const OBSERVATION_SURFACES = [
  'BROWSER',
  'NATIVE_APP',
  'DESKTOP_APP',
  'POS_TERMINAL',
  'DEVICE_OS',
  'DEVICE_SENSOR',
  'PROVIDER_API',
  'WEBHOOK',
  'SDK',
  'CLI',
  'EDGE_NODE',
  'NETWORK',
] as const;

export type ObservationSurface = (typeof OBSERVATION_SURFACES)[number];

export const SIGNAL_CLASSES = [
  'STATE',
  'EVENT',
  'TRANSACTION',
  'COMMAND',
  'RECEIPT',
  'MEASUREMENT',
  'SESSION',
  'CONTENT',
] as const;

export type SignalClass = (typeof SIGNAL_CLASSES)[number];

export const EXECUTION_CLASSES = [
  'PROVIDER_NATIVE',
  'PROVIDER_NATIVE_REMOTE',
  'EMULATED_LOCAL',
  'LOCAL_NATIVE',
  'EDGE',
] as const;

export type ExecutionClass = (typeof EXECUTION_CLASSES)[number];

export interface ProviderReference {
  id: string;
  family?: string;
  executionClass: ExecutionClass;
  endpointRef?: string;
  providerReceiptRef?: string;
}

export interface SignalEnvelope {
  id: string;
  domain: SourceDomain;
  surface: ObservationSurface;
  signal: string;
  signalClass: SignalClass;
  provider: ProviderReference;

  principalRef?: string;
  deviceRef?: string;
  locationContextRef?: string;
  applicationRef?: string;
  resourceRef?: string;

  // Authority is referenced, never inferred from the observed action.
  wardenDecisionRef?: string;

  // Evidence is referenced, never replaced by Synnergyze's normalized record.
  riverEvidenceRefs: string[];

  observedAt: string;
  schemaVersion: 'synnergyze.signal.r0.1';
}

const sourceDomainSet = new Set<string>(SOURCE_DOMAINS);
const observationSurfaceSet = new Set<string>(OBSERVATION_SURFACES);
const signalClassSet = new Set<string>(SIGNAL_CLASSES);
const executionClassSet = new Set<string>(EXECUTION_CLASSES);

export function isSourceDomain(value: string): value is SourceDomain {
  return sourceDomainSet.has(value);
}

export function isObservationSurface(
  value: string,
): value is ObservationSurface {
  return observationSurfaceSet.has(value);
}

export function isSignalClass(value: string): value is SignalClass {
  return signalClassSet.has(value);
}

export function isExecutionClass(value: string): value is ExecutionClass {
  return executionClassSet.has(value);
}

export function assertSignalEnvelope(value: SignalEnvelope): void {
  if (!value.id) {
    throw new Error('SignalEnvelope.id is required');
  }
  if (!isSourceDomain(value.domain)) {
    throw new Error(`Unsupported source domain: ${value.domain}`);
  }
  if (!isObservationSurface(value.surface)) {
    throw new Error(`Unsupported observation surface: ${value.surface}`);
  }
  if (!value.signal) {
    throw new Error('SignalEnvelope.signal is required');
  }
  if (!isSignalClass(value.signalClass)) {
    throw new Error(`Unsupported signal class: ${value.signalClass}`);
  }
  if (!value.provider?.id) {
    throw new Error('SignalEnvelope.provider.id is required');
  }
  if (!isExecutionClass(value.provider.executionClass)) {
    throw new Error(
      `Unsupported execution class: ${value.provider.executionClass}`,
    );
  }
  if (!Array.isArray(value.riverEvidenceRefs)) {
    throw new Error('SignalEnvelope.riverEvidenceRefs must be an array');
  }
  if (Number.isNaN(Date.parse(value.observedAt))) {
    throw new Error('SignalEnvelope.observedAt must be an ISO timestamp');
  }
  if (value.schemaVersion !== 'synnergyze.signal.r0.1') {
    throw new Error(
      `Unsupported SignalEnvelope schema version: ${value.schemaVersion}`,
    );
  }
}
