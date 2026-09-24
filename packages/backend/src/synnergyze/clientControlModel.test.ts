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
import {
  assertClientControlContext,
  assertDeveloperSupportSession,
  CLIENT_ADMIN_CAPABILITIES,
  VSR_DEVELOPER_CAPABILITIES,
  type ClientControlContext,
  type DeveloperSupportSession,
} from './clientControlModel';

describe('VSR client control model', () => {
  it('keeps client administration separate from VSR engineering', () => {
    expect(CLIENT_ADMIN_CAPABILITIES).toContain(
      'GENESIS_CONFIGURE_ELIGIBLE_NODE',
    );
    expect(CLIENT_ADMIN_CAPABILITIES).not.toContain(
      'GENESIS_REPAIR_RUNTIME' as never,
    );
    expect(VSR_DEVELOPER_CAPABILITIES).toContain('GENESIS_REPAIR_RUNTIME');
  });

  it('validates a bounded client admin context', () => {
    const context: ClientControlContext = {
      schemaVersion: 'vsr.client-control.r0.1',
      clientRef: 'CLIENT-001',
      actorRef: 'DIGITALME-CLIENT-ADMIN-001',
      role: 'CLIENT_ADMIN',
      wardenAccountRef: 'WARDEN-CLIENT-001',
      genesisClientRef: 'GENESIS-CLIENT-001',
      synnergyzeLicenseRef: 'SYN-LIC-001',
      clientStackRefs: ['CLIENT-STACK-001'],
      effectiveAt: '2026-09-23T10:00:00.000Z',
    };

    expect(() => assertClientControlContext(context)).not.toThrow();
  });

  it('requires Warden authority for a VSR developer support session', () => {
    const session: DeveloperSupportSession = {
      schemaVersion: 'warden.developer-session.r0.1',
      sessionRef: 'DEV-SESSION-001',
      clientRef: 'CLIENT-001',
      clientAdminRef: 'DIGITALME-CLIENT-ADMIN-001',
      developerRef: 'DIGITALME-VSR-DEVELOPER-001',
      purpose: 'Repair client runtime',
      requestedCapabilities: ['GENESIS_REPAIR_RUNTIME'],
      wardenDecisionRef: 'WARDEN-DECISION-001',
      startsAt: '2026-09-23T10:00:00.000Z',
      expiresAt: '2026-09-23T11:00:00.000Z',
      riverEvidenceRefs: [],
    };

    expect(() => assertDeveloperSupportSession(session)).not.toThrow();
  });

  it('rejects a non-expiring / reversed developer session', () => {
    const session = {
      schemaVersion: 'warden.developer-session.r0.1',
      sessionRef: 'DEV-SESSION-002',
      clientRef: 'CLIENT-001',
      clientAdminRef: 'DIGITALME-CLIENT-ADMIN-001',
      developerRef: 'DIGITALME-VSR-DEVELOPER-001',
      purpose: 'Inspect diagnostics',
      requestedCapabilities: ['SYNNERGYZE_INSPECT_DIAGNOSTICS'],
      wardenDecisionRef: 'WARDEN-DECISION-002',
      startsAt: '2026-09-23T11:00:00.000Z',
      expiresAt: '2026-09-23T10:00:00.000Z',
      riverEvidenceRefs: [],
    } as DeveloperSupportSession;

    expect(() => assertDeveloperSupportSession(session)).toThrow(
      'expiresAt must be after startsAt',
    );
  });
});
