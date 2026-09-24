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
 * Synnergyze / VSR Client Control Model R0.1
 *
 * Client Admin operates a bounded client estate.
 * VSR Developer engineers/supports that estate under Warden authority.
 * VSR Estate Admin is reserved for estate-wide governance and must not be
 * conflated with a client's Admin role.
 */

export const CONTROL_ROLES = [
  'CLIENT_ADMIN',
  'VSR_DEVELOPER',
  'VSR_ESTATE_ADMIN',
] as const;

export type ControlRole = (typeof CONTROL_ROLES)[number];

export const CONTROL_PLANES = ['GENESIS', 'SYNNERGYZE'] as const;
export type ControlPlane = (typeof CONTROL_PLANES)[number];

export const CLIENT_CONTROL_SURFACES = [
  'GENESIS_NETWORK',
  'SYNNERGYZE_WORKSPACES',
  'WARDEN_LIVE',
  'RIVER_ACTIVITY',
  'SILK_ECONOMICS',
] as const;

export type ClientControlSurface = (typeof CLIENT_CONTROL_SURFACES)[number];

export const CLIENT_ADMIN_CAPABILITIES = [
  'GENESIS_VIEW_NETWORK',
  'GENESIS_CONFIGURE_ELIGIBLE_NODE',
  'GENESIS_ASSIGN_ELIGIBLE_PROVIDER',
  'SYNNERGYZE_VIEW_WORKSPACE',
  'SYNNERGYZE_START_WORKSPACE',
  'SYNNERGYZE_STOP_WORKSPACE',
  'SYNNERGYZE_ASSIGN_WORKSPACE_NODE',
  'SYNNERGYZE_VIEW_USAGE',
  'WARDEN_VIEW_DECISIONS',
  'WARDEN_REQUEST_DEVELOPER_SESSION',
  'RIVER_VIEW_CLIENT_ACTIVITY',
  'SILK_VIEW_CLIENT_ECONOMICS',
] as const;

export const VSR_DEVELOPER_CAPABILITIES = [
  'GENESIS_PROVISION_STACK',
  'GENESIS_REPAIR_RUNTIME',
  'GENESIS_UPGRADE_STACK',
  'GENESIS_MANAGE_PROVIDER_ADAPTER',
  'SYNNERGYZE_ENGINEER_WORKSPACE',
  'SYNNERGYZE_MANAGE_CAPABILITY_ADAPTER',
  'SYNNERGYZE_DEPLOY_SERVICE',
  'SYNNERGYZE_INSPECT_DIAGNOSTICS',
  'WARDEN_JOIN_AUTHORIZED_CLIENT_SESSION',
  'RIVER_APPEND_ENGINEERING_EVIDENCE',
] as const;

export type ClientAdminCapability = (typeof CLIENT_ADMIN_CAPABILITIES)[number];
export type VsrDeveloperCapability =
  (typeof VSR_DEVELOPER_CAPABILITIES)[number];

export interface ClientControlContext {
  schemaVersion: 'vsr.client-control.r0.1';
  clientRef: string;
  actorRef: string;
  role: ControlRole;
  wardenAccountRef: string;
  genesisClientRef: string;
  synnergyzeLicenseRef: string;
  clientStackRefs: string[];
  effectiveAt: string;
}

export interface DeveloperSupportSession {
  schemaVersion: 'warden.developer-session.r0.1';
  sessionRef: string;
  clientRef: string;
  clientAdminRef: string;
  developerRef: string;
  purpose: string;
  requestedCapabilities: VsrDeveloperCapability[];
  wardenDecisionRef: string;
  startsAt: string;
  expiresAt: string;
  riverEvidenceRefs: string[];
}

export interface ClientProjectionLink {
  schemaVersion: 'vsr.client-projection.r0.1';
  clientRef: string;
  controlPlane: ControlPlane;
  developerObjectRef: string;
  clientRoute: string;
  wardenDecisionRef?: string;
  riverEvidenceRefs: string[];
  projectionState: 'PENDING' | 'CURRENT' | 'STALE' | 'BLOCKED';
  projectedAt?: string;
}

export function assertClientControlContext(value: ClientControlContext): void {
  if (!value.clientRef) throw new Error('clientRef is required');
  if (!value.actorRef) throw new Error('actorRef is required');
  if (!CONTROL_ROLES.includes(value.role)) {
    throw new Error(`Unsupported control role: ${value.role}`);
  }
  if (!value.wardenAccountRef) {
    throw new Error('wardenAccountRef is required');
  }
  if (!value.genesisClientRef) {
    throw new Error('genesisClientRef is required');
  }
  if (!value.synnergyzeLicenseRef) {
    throw new Error('synnergyzeLicenseRef is required');
  }
  if (!Array.isArray(value.clientStackRefs)) {
    throw new Error('clientStackRefs must be an array');
  }
  if (Number.isNaN(Date.parse(value.effectiveAt))) {
    throw new Error('effectiveAt must be an ISO timestamp');
  }
  if (value.schemaVersion !== 'vsr.client-control.r0.1') {
    throw new Error(
      `Unsupported client-control schema: ${value.schemaVersion}`,
    );
  }
}

export function assertDeveloperSupportSession(
  value: DeveloperSupportSession,
): void {
  if (!value.sessionRef) throw new Error('sessionRef is required');
  if (!value.clientRef) throw new Error('clientRef is required');
  if (!value.clientAdminRef) throw new Error('clientAdminRef is required');
  if (!value.developerRef) throw new Error('developerRef is required');
  if (!value.purpose) throw new Error('purpose is required');
  if (!value.wardenDecisionRef) {
    throw new Error('wardenDecisionRef is required');
  }
  if (Date.parse(value.expiresAt) <= Date.parse(value.startsAt)) {
    throw new Error('expiresAt must be after startsAt');
  }
  if (value.schemaVersion !== 'warden.developer-session.r0.1') {
    throw new Error(
      `Unsupported developer-session schema: ${value.schemaVersion}`,
    );
  }
}
