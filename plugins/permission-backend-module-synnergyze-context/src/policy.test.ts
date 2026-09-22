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

import { UserInfoService } from '@backstage/backend-plugin-api';
import {
  catalogEntityReadPermission,
  catalogLocationDeletePermission,
} from '@backstage/plugin-catalog-common/alpha';
import {
  AuthorizeResult,
  createPermission,
} from '@backstage/plugin-permission-common';
import {
  synnergyzeBillingReadPermission,
  OperatingContext,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import { SynnergyzeOperatingContextService } from '@esomoire/backstage-plugin-synnergyze-context-node';
import { SynnergyzeContextPermissionPolicy } from './policy';

const user = {
  credentials: {} as any,
  info: {} as any,
};

const userInfo = {
  getUserInfo: async () => ({
    userEntityRef: 'user:default/faiz',
    ownershipEntityRefs: [],
  }),
} as unknown as UserInfoService;

const contextService = (
  context: OperatingContext | undefined,
): SynnergyzeOperatingContextService => ({
  get: async () => context,
  set: async () => undefined,
  clear: async () => undefined,
});

const adminContext: OperatingContext = {
  principal: 'user:default/faiz',
  role: 'admin',
  scope: {
    type: 'estate',
    estateRef: 'estate:default/alpha',
  },
  spotlightRef: 'spotlight:alpha',
  wardenDecisionRef: 'warden:decision:admin',
  authorityExpiresAt: '2099-01-01T00:00:00.000Z',
  riverSessionRef: 'river:session:admin',
};

const developerContext: OperatingContext = {
  principal: 'user:default/faiz',
  role: 'developer',
  scope: {
    type: 'company',
    companyRef: 'company:default/voi-jeans',
  },
  spotlightRef: 'spotlight:voi-jeans',
  wardenDecisionRef: 'warden:decision:developer',
  authorityExpiresAt: '2099-01-01T00:00:00.000Z',
  riverSessionRef: 'river:session:developer',
};

describe('SynnergyzeContextPermissionPolicy', () => {
  it('denies catalog reads without an active context', async () => {
    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(undefined),
    );

    await expect(
      policy.handle({ permission: catalogEntityReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.DENY,
    });
  });

  it('allows estate-wide catalog reads in Admin context', async () => {
    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(adminContext),
    );

    await expect(
      policy.handle({ permission: catalogEntityReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.ALLOW,
    });
  });

  it('returns a company annotation condition in Developer context', async () => {
    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(developerContext),
    );

    const decision = await policy.handle(
      { permission: catalogEntityReadPermission },
      user,
    );

    expect(decision.result).toBe(AuthorizeResult.CONDITIONAL);
    expect((decision as any).conditions).toEqual(
      expect.objectContaining({
        rule: 'HAS_ANNOTATION',
        params: {
          annotation: 'vsr.esomoire.io/company-ref',
          value: 'company:default/voi-jeans',
        },
      }),
    );
  });

  it('denies global catalog administration in Developer context', async () => {
    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(developerContext),
    );

    await expect(
      policy.handle({ permission: catalogLocationDeletePermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.DENY,
    });
  });

  it('narrows Developer catalog conditions to workspace and project', async () => {
    const scopedContext: OperatingContext = {
      ...developerContext,
      scope: {
        type: 'company',
        companyRef: 'company:default/voi-jeans',
        workspaceRef: 'workspace:default/retail',
        projectRef: 'project:default/storefront',
      },
    };

    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(scopedContext),
    );

    const decision = await policy.handle(
      { permission: catalogEntityReadPermission },
      user,
    );

    expect(decision.result).toBe(AuthorizeResult.CONDITIONAL);
    expect((decision as any).conditions).toEqual(
      expect.objectContaining({
        allOf: expect.arrayContaining([
          expect.objectContaining({
            rule: 'HAS_ANNOTATION',
            params: {
              annotation: 'vsr.esomoire.io/company-ref',
              value: 'company:default/voi-jeans',
            },
          }),
          expect.objectContaining({
            rule: 'HAS_ANNOTATION',
            params: {
              annotation: 'vsr.esomoire.io/workspace-ref',
              value: 'workspace:default/retail',
            },
          }),
          expect.objectContaining({
            rule: 'HAS_ANNOTATION',
            params: {
              annotation: 'vsr.esomoire.io/project-ref',
              value: 'project:default/storefront',
            },
          }),
        ]),
      }),
    );
  });

  it('denies a malformed Developer context that is not company scoped', async () => {
    const malformed = {
      ...developerContext,
      scope: {
        type: 'estate',
        estateRef: 'estate:default/alpha',
      },
    } as unknown as OperatingContext;

    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(malformed),
    );

    await expect(
      policy.handle({ permission: catalogEntityReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.DENY,
    });
  });

  it('denies billing for a malformed role/scope combination', async () => {
    const malformed = {
      ...developerContext,
      scope: {
        type: 'estate',
        estateRef: 'estate:default/alpha',
      },
    } as unknown as OperatingContext;

    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(malformed),
    );

    await expect(
      policy.handle({ permission: synnergyzeBillingReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.DENY,
    });
  });

  it('keeps unmigrated permissions allowed during the R0.3 compatibility window', async () => {
    const permission = createPermission({
      name: 'example.unmigrated.read',
      attributes: { action: 'read' },
    });

    const policy = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(undefined),
    );

    await expect(
      policy.handle({ permission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.ALLOW,
    });
  });

  it('allows billing read only when an active context exists', async () => {
    const allowed = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(developerContext),
    );
    const denied = new SynnergyzeContextPermissionPolicy(
      userInfo,
      contextService(undefined),
    );

    await expect(
      allowed.handle({ permission: synnergyzeBillingReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.ALLOW,
    });

    await expect(
      denied.handle({ permission: synnergyzeBillingReadPermission }, user),
    ).resolves.toEqual({
      result: AuthorizeResult.DENY,
    });
  });
});
