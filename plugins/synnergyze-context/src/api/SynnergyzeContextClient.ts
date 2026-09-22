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
  DiscoveryApi,
  FetchApi,
} from '@backstage/frontend-plugin-api';
import {
  ContextOptionsResponse,
  ContextRequest,
  OperatingContext,
  SynnergyzeContextApi,
  WardenAuthorizationResult,
} from './types';

type ClientOptions = {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
};

export class SynnergyzeContextClient implements SynnergyzeContextApi {
  constructor(private readonly options: ClientOptions) {}

  private async baseUrl(): Promise<string> {
    return this.options.discoveryApi.getBaseUrl('synnergyze-context');
  }

  async getActiveContext(): Promise<OperatingContext | undefined> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context`,
    );

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(
        `Unable to load operating context (HTTP ${response.status})`,
      );
    }

    return response.json() as Promise<OperatingContext>;
  }

  async listEligibleContexts(): Promise<ContextOptionsResponse> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context/options`,
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load eligible contexts (HTTP ${response.status})`,
      );
    }

    const body = (await response.json()) as unknown;
    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as Record<string, unknown>).discoveryAvailable !== 'boolean' ||
      !Array.isArray((body as Record<string, unknown>).options)
    ) {
      throw new Error('Invalid eligible-context response');
    }

    return body as ContextOptionsResponse;
  }

  async resolveContext(
    request: ContextRequest,
  ): Promise<WardenAuthorizationResult> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context/resolve`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      },
    );

    const body = (await response.json()) as unknown;

    if (response.status === 403) {
      const reason =
        body &&
        typeof body === 'object' &&
        typeof (body as Record<string, unknown>).reason === 'string'
          ? String((body as Record<string, unknown>).reason)
          : 'Warden denied the requested context';

      return { authorized: false, reason };
    }

    if (!response.ok) {
      throw new Error(
        `Unable to resolve operating context (HTTP ${response.status})`,
      );
    }

    return body as WardenAuthorizationResult;
  }

  async transitionContext(
    request: ContextRequest,
  ): Promise<OperatingContext> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context/transition`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      let detail = '';
      try {
        const body = (await response.json()) as Record<string, unknown>;
        detail =
          typeof body.reason === 'string'
            ? body.reason
            : typeof body.error === 'string'
              ? body.error
              : '';
      } catch {
        detail = '';
      }

      throw new Error(
        detail ||
          `Unable to activate operating context (HTTP ${response.status})`,
      );
    }

    return response.json() as Promise<OperatingContext>;
  }
}
