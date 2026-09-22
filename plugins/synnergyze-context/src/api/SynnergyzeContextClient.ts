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

function errorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const value = body as Record<string, unknown>;
  if (typeof value.error === 'string') {
    return value.error;
  }
  if (typeof value.reason === 'string') {
    return value.reason;
  }
  return undefined;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export class SynnergyzeContextClient implements SynnergyzeContextApi {
  constructor(private readonly options: ClientOptions) {}

  private async baseUrl(): Promise<string> {
    return this.options.discoveryApi.getBaseUrl('synnergyze-context');
  }

  async getActiveContext(): Promise<OperatingContext | undefined> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context`,
    );
    const body = await readJson(response);

    if (
      response.status === 404 &&
      errorDetail(body) === 'No active operating context'
    ) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(
        errorDetail(body) ??
          `Unable to load operating context (HTTP ${response.status})`,
      );
    }

    if (!body || typeof body !== 'object') {
      throw new Error('Invalid operating-context response');
    }

    return body as OperatingContext;
  }

  async listEligibleContexts(): Promise<ContextOptionsResponse> {
    const response = await this.options.fetchApi.fetch(
      `${await this.baseUrl()}/context/options`,
    );
    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(
        errorDetail(body) ??
          `Unable to load eligible contexts (HTTP ${response.status})`,
      );
    }

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
    const body = await readJson(response);

    if (response.status === 403) {
      return {
        authorized: false,
        reason:
          errorDetail(body) ?? 'Warden denied the requested context',
      };
    }

    if (!response.ok) {
      throw new Error(
        errorDetail(body) ??
          `Unable to resolve operating context (HTTP ${response.status})`,
      );
    }

    if (!body || typeof body !== 'object') {
      throw new Error('Invalid Warden authorization response');
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
    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(
        errorDetail(body) ??
          `Unable to activate operating context (HTTP ${response.status})`,
      );
    }

    if (!body || typeof body !== 'object') {
      throw new Error('Invalid operating-context transition response');
    }

    return body as OperatingContext;
  }
}
