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
