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
import {
  synnergyzeContextAuthorizationExtensionPoint,
  synnergyzeContextObservationExtensionPoint,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import {
  HttpRiverContextObserver,
  HttpWardenContextAuthorizer,
} from './providers';

export const alphaSynnergyzeContextModule = createBackendModule({
  pluginId: 'synnergyze-context',
  moduleId: 'alpha-warden-river',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        authorization: synnergyzeContextAuthorizationExtensionPoint,
        observation: synnergyzeContextObservationExtensionPoint,
      },
      async init({ config, logger, authorization, observation }) {
        const wardenBaseUrl = config.getOptionalString(
          'synnergyze.context.warden.baseUrl',
        );
        const riverBaseUrl = config.getOptionalString(
          'synnergyze.context.river.baseUrl',
        );

        if (wardenBaseUrl) {
          authorization.setAuthorizer(
            new HttpWardenContextAuthorizer({
              baseUrl: wardenBaseUrl,
              path:
                config.getOptionalString(
                  'synnergyze.context.warden.authorizePath',
                ) ?? '/authorize',
              listPath: config.getOptionalString(
                'synnergyze.context.warden.optionsPath',
              ),
              bearerToken: config.getOptionalString(
                'synnergyze.context.warden.bearerToken',
              ),
            }),
          );
        } else {
          logger.warn(
            'Synnergyze context Warden adapter is not configured; authorization will fail closed',
          );
        }

        if (riverBaseUrl) {
          observation.setObserver(
            new HttpRiverContextObserver({
              baseUrl: riverBaseUrl,
              path:
                config.getOptionalString(
                  'synnergyze.context.river.transitionPath',
                ) ?? '/events/context-transition',
              bearerToken: config.getOptionalString(
                'synnergyze.context.river.bearerToken',
              ),
            }),
          );
        } else {
          logger.warn(
            'Synnergyze context River adapter is not configured; transitions will fail closed',
          );
        }
      },
    });
  },
});
