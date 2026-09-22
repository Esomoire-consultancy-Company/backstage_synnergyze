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
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  RiverContextObserver,
  synnergyzeContextAuthorizationExtensionPoint,
  synnergyzeContextObservationExtensionPoint,
  WardenContextAuthorizer,
  synnergyzeOperatingContextServiceRef,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import { createRouter } from './router';

class ContextAuthorizationExtensionPointImpl {
  #authorizer: WardenContextAuthorizer | undefined;

  setAuthorizer(authorizer: WardenContextAuthorizer): void {
    if (this.#authorizer) {
      throw new Error('Synnergyze context authorizer is already registered');
    }
    this.#authorizer = authorizer;
  }

  get authorizer(): WardenContextAuthorizer | undefined {
    return this.#authorizer;
  }
}

class ContextObservationExtensionPointImpl {
  #observer: RiverContextObserver | undefined;

  setObserver(observer: RiverContextObserver): void {
    if (this.#observer) {
      throw new Error('Synnergyze context observer is already registered');
    }
    this.#observer = observer;
  }

  get observer(): RiverContextObserver | undefined {
    return this.#observer;
  }
}

export const synnergyzeContextPlugin = createBackendPlugin({
  pluginId: 'synnergyze-context',
  register(env) {
    const authorization = new ContextAuthorizationExtensionPointImpl();
    const observation = new ContextObservationExtensionPointImpl();

    env.registerExtensionPoint(
      synnergyzeContextAuthorizationExtensionPoint,
      authorization,
    );
    env.registerExtensionPoint(
      synnergyzeContextObservationExtensionPoint,
      observation,
    );

    env.registerInit({
      deps: {
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        httpRouter: coreServices.httpRouter,
        contextService: synnergyzeOperatingContextServiceRef,
        permissions: coreServices.permissions,
      },
      async init({
        httpAuth,
        userInfo,
        httpRouter,
        contextService,
        permissions,
      }) {
        httpRouter.use(
          await createRouter({
            httpAuth,
            userInfo,
            store: contextService,
            permissions,
            authorizer: authorization.authorizer,
            observer: observation.observer,
          }),
        );

        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
