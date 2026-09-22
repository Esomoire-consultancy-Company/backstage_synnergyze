/*
 * Synnergyze context-aware permission policy.
 *
 * A catalog principal may hold both Developer and Admin memberships, but the
 * active session only carries the group for the selected context. GitHub sign-in
 * defaults to Developer. A future Admin context issuer can mint the same user
 * principal with only the admin group in the active ownership claims.
 */

import {
  coreServices,
  createBackendModule,
  type UserInfoService,
} from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  isResourcePermission,
  type PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  catalogConditions,
  createCatalogConditionalDecision,
} from '@backstage/plugin-catalog-backend/alpha';
import {
  type PermissionPolicy,
  type PolicyQuery,
  type PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';

export const SYNNERGYZE_DEVELOPER_GROUP =
  'group:default/synnergyze-developers';
export const SYNNERGYZE_ADMIN_GROUP = 'group:default/synnergyze-admins';

export class SynnergyzePermissionPolicy implements PermissionPolicy {
  constructor(private readonly userInfo: UserInfoService) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    if (!user) {
      return { result: AuthorizeResult.DENY };
    }

    const info = await this.userInfo.getUserInfo(user.credentials);
    const ownership = new Set(info.ownershipEntityRefs);

    // Admin is an explicit active context, not implied by catalog membership.
    if (ownership.has(SYNNERGYZE_ADMIN_GROUP)) {
      return { result: AuthorizeResult.ALLOW };
    }

    if (!ownership.has(SYNNERGYZE_DEVELOPER_GROUP)) {
      return { result: AuthorizeResult.DENY };
    }

    const action = request.permission.attributes.action;

    // Developers can inspect the catalog broadly. Mutations are constrained to
    // entities they own through their active developer ownership claims.
    if (isResourcePermission(request.permission, 'catalog-entity')) {
      if (action === 'read') {
        return { result: AuthorizeResult.ALLOW };
      }

      return createCatalogConditionalDecision(
        request.permission,
        catalogConditions.isEntityOwner({
          claims: info.ownershipEntityRefs,
        }),
      );
    }

    // Arbitrary Kubernetes proxying is an estate-level capability.
    if (request.permission.name === 'kubernetes.proxy') {
      return { result: AuthorizeResult.DENY };
    }

    // Developer context never receives an unconditional delete capability.
    if (action === 'delete') {
      return { result: AuthorizeResult.DENY };
    }

    // Read/create/update operations remain available to developer workflows.
    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'synnergyze-context-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        userInfo: coreServices.userInfo,
      },
      async init({ policy, userInfo }) {
        policy.setPolicy(new SynnergyzePermissionPolicy(userInfo));
      },
    });
  },
});
