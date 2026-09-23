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
  catalogConditions,
  createCatalogConditionalDecision,
} from '@backstage/plugin-catalog-backend/alpha';
import {
  catalogEntityCreatePermission,
  catalogEntityValidatePermission,
  catalogIngestionManagePermission,
  catalogIngestionReadPermission,
  catalogLocationAnalyzePermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
  catalogLocationReadPermission,
} from '@backstage/plugin-catalog-common/alpha';
import {
  AuthorizeResult,
  isPermission,
  isResourcePermission,
  PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import {
  synnergyzeBillingReadPermission,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import {
  SynnergyzeOperatingContextService,
} from '@esomoire/backstage-plugin-synnergyze-context-node';

const COMPANY_ANNOTATION = 'vsr.esomoire.io/company-ref';

const CATALOG_GLOBAL_PERMISSION_NAMES = new Set([
  catalogEntityCreatePermission.name,
  catalogEntityValidatePermission.name,
  catalogLocationReadPermission.name,
  catalogLocationCreatePermission.name,
  catalogLocationDeletePermission.name,
  catalogLocationAnalyzePermission.name,
  catalogIngestionReadPermission.name,
  catalogIngestionManagePermission.name,
]);

export class SynnergyzeContextPermissionPolicy implements PermissionPolicy {
  constructor(
    private readonly userInfo: UserInfoService,
    private readonly contexts: SynnergyzeOperatingContextService,
  ) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const catalogPermission = isResourcePermission(
      request.permission,
      'catalog-entity',
    )
      ? request.permission
      : undefined;
    const isCatalogResource = Boolean(catalogPermission);
    const isBillingRead = isPermission(
      request.permission,
      synnergyzeBillingReadPermission,
    );
    const isGlobalCatalogPermission =
      CATALOG_GLOBAL_PERMISSION_NAMES.has(request.permission.name);

    if (!isCatalogResource && !isBillingRead && !isGlobalCatalogPermission) {
      // Preserve current Backstage behavior for permissions not yet migrated
      // into the Warden-bound policy surface.
      return { result: AuthorizeResult.ALLOW };
    }

    if (!user) {
      return { result: AuthorizeResult.DENY };
    }

    const info = await this.userInfo.getUserInfo(user.credentials);
    const context = await this.contexts.get(info.userEntityRef);

    if (!context) {
      return { result: AuthorizeResult.DENY };
    }

    if (isBillingRead) {
      if (context.role === 'admin' && context.scope.type === 'estate') {
        return { result: AuthorizeResult.ALLOW };
      }

      if (context.role === 'developer' && context.scope.type === 'company') {
        return { result: AuthorizeResult.ALLOW };
      }

      return { result: AuthorizeResult.DENY };
    }

    if (context.role === 'admin') {
      return { result: AuthorizeResult.ALLOW };
    }

    if (isGlobalCatalogPermission) {
      // These permissions cannot be resource-filtered by company. Keep them
      // Admin-only until a narrower resource model exists.
      return { result: AuthorizeResult.DENY };
    }

    if (catalogPermission && context.scope.type === 'company') {
      const companyCondition = catalogConditions.hasAnnotation({
        annotation: COMPANY_ANNOTATION,
        value: context.scope.companyRef,
      });
      const workspaceCondition = context.scope.workspaceRef
        ? catalogConditions.hasAnnotation({
            annotation: 'vsr.esomoire.io/workspace-ref',
            value: context.scope.workspaceRef,
          })
        : undefined;
      const projectCondition = context.scope.projectRef
        ? catalogConditions.hasAnnotation({
            annotation: 'vsr.esomoire.io/project-ref',
            value: context.scope.projectRef,
          })
        : undefined;

      if (workspaceCondition && projectCondition) {
        return createCatalogConditionalDecision(catalogPermission, {
          allOf: [companyCondition, workspaceCondition, projectCondition],
        });
      }

      if (workspaceCondition) {
        return createCatalogConditionalDecision(catalogPermission, {
          allOf: [companyCondition, workspaceCondition],
        });
      }

      if (projectCondition) {
        return createCatalogConditionalDecision(catalogPermission, {
          allOf: [companyCondition, projectCondition],
        });
      }

      return createCatalogConditionalDecision(
        catalogPermission,
        companyCondition,
      );
    }

    return { result: AuthorizeResult.DENY };
  }
}
