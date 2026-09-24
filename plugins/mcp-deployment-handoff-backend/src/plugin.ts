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
  createBackendPlugin,
  createExtensionPoint,
} from '@backstage/backend-plugin-api';
import { DeploymentHandoffService } from './service';
import type { HandoffServiceOptions } from './types';

export const deploymentHandoffExtensionPoint = createExtensionPoint<{
  service: DeploymentHandoffService;
}>({ id: 'mcp-deployment-handoff.service' });

/** Configure trusted receiver policy and external ports at composition time. */
export function createDeploymentHandoffPlugin(options: HandoffServiceOptions) {
  return createBackendPlugin({
    pluginId: 'mcp-deployment-handoff',
    register(env) {
      env.registerExtensionPoint(deploymentHandoffExtensionPoint, {
        service: DeploymentHandoffService.create(options),
      });
      env.registerInit({
        deps: {},
        async init() {
          // The in-memory service needs no external resources at startup.
        },
      });
    },
  });
}
