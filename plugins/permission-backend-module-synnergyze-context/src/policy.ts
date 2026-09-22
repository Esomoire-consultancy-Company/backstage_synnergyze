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

const CATALOG_GLOBAL_PERMISSIONS = [
  catalogEntityCreatePermission,
  catalogEntityValidatePermission,
  catalogLocationReadPermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
  catalogLocationAnalyzePermission,
  catalogIngestionReadPermission,
  catalogIngestionManagePermission,
];

export class SynnergyzeContextPermissionPolicy implements PermissionPolicy {
  constructor(
    private readonly userInfo: UserInfoService,
    private readonly contexts: SynnergyzeOperatingContextService,
  ) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const isCatalogResource = isResourcePermission(
      request.permission,
      'catalog-entity',
    );
    const isBillingRead = isPermission(
      request.permission,
      synnergyzeBillingReadPermission,
    );
    const isGlobalCatalogPermission = CATALOG_GLOBAL_PERMISSIONS.some(
      permission => isPermission(request.permission, permission),
    );

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
      // The billing handler must use the same active context to choose
      // Estate aggregation vs company/workspace scope.
      return { result: AuthorizeResult.ALLOW };
    }

    if (context.role === 'admin') {
      return { result: AuthorizeResult.ALLOW };
    }

    if (isGlobalCatalogPermission) {
      // These permissions cannot be resource-filtered by company. Keep them
      // Admin-only until a narrower resource model exists.
      return { result: AuthorizeResult.DENY };
    }

    if (isCatalogResource && context.scope.type === 'company') {
      return createCatalogConditionalDecision(
        request.permission,
        catalogConditions.hasAnnotation({
          annotation: COMPANY_ANNOTATION,
          value: context.scope.companyRef,
        }),
      );
    }

    return { result: AuthorizeResult.DENY };
  }
}
