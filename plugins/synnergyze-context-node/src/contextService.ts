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
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import {
  assertContextIsActive,
  OperatingContext,
} from '@esomoire/backstage-plugin-synnergyze-context-common';

export interface SynnergyzeOperatingContextService {
  get(principal: string): Promise<OperatingContext | undefined>;
  set(context: OperatingContext): Promise<void>;
  clear(principal: string): Promise<void>;
}

class DefaultSynnergyzeOperatingContextService
  implements SynnergyzeOperatingContextService
{
  readonly #contexts = new Map<string, OperatingContext>();

  async get(principal: string): Promise<OperatingContext | undefined> {
    const context = this.#contexts.get(principal);
    if (!context) {
      return undefined;
    }

    try {
      assertContextIsActive(context);
      return context;
    } catch {
      this.#contexts.delete(principal);
      return undefined;
    }
  }

  async set(context: OperatingContext): Promise<void> {
    assertContextIsActive(context);
    this.#contexts.set(context.principal, { ...context });
  }

  async clear(principal: string): Promise<void> {
    this.#contexts.delete(principal);
  }
}

export const synnergyzeOperatingContextServiceRef =
  createServiceRef<SynnergyzeOperatingContextService>({
    id: 'synnergyze.operating-context',
    scope: 'root',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {},
        async factory() {
          return new DefaultSynnergyzeOperatingContextService();
        },
      }),
  });
