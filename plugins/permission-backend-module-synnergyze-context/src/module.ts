import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  synnergyzeOperatingContextServiceRef,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import { SynnergyzeContextPermissionPolicy } from './policy';

export const synnergyzeContextPermissionModule = createBackendModule({
  pluginId: 'permission',
  moduleId: 'synnergyze-context-policy',
  register(env) {
    env.registerInit({
      deps: {
        policy: policyExtensionPoint,
        userInfo: coreServices.userInfo,
        contexts: synnergyzeOperatingContextServiceRef,
      },
      async init({ policy, userInfo, contexts }) {
        policy.setPolicy(
          new SynnergyzeContextPermissionPolicy(userInfo, contexts),
        );
      },
    });
  },
});
