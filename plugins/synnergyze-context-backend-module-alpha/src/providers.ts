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
  ContextRequest,
  ContextTransitionEvent,
  OperatingContextOption,
  parseContextRequest,
  RiverTransitionReceipt,
  WardenAuthorizationResult,
  WardenContextDecision,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import {
  RiverContextObserver,
  WardenContextAuthorizer,
} from '@esomoire/backstage-plugin-synnergyze-context-node';

export type HttpProviderOptions = {
  baseUrl: string;
  path: string;
  listPath?: string;
  bearerToken?: string;
};

function endpointFor(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function headers(token?: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function parseContextOption(value: unknown): OperatingContextOption {
  if (!value || typeof value !== 'object') {
    throw new Error('Warden context option must be an object');
  }

  const input = value as Record<string, unknown>;
  const request = parseContextRequest({
    role: input.role,
    scope: input.scope,
    spotlightRef: input.spotlightRef,
  });

  const base = {
    id: requireString(input.id, 'contextOption.id'),
    label: requireString(input.label, 'contextOption.label'),
    ...(request.spotlightRef ? { spotlightRef: request.spotlightRef } : {}),
  };

  if (request.role === 'admin' && request.scope.type === 'estate') {
    return {
      ...base,
      role: 'admin',
      scope: request.scope,
    };
  }

  if (request.role === 'developer' && request.scope.type === 'company') {
    return {
      ...base,
      role: 'developer',
      scope: request.scope,
    };
  }

  throw new Error('Warden context option has an invalid role/scope pairing');
}

function parseWardenDecision(value: unknown): WardenContextDecision {
  if (!value || typeof value !== 'object') {
    throw new Error('Warden decision must be an object');
  }

  const input = value as Record<string, unknown>;
  const requestShape = parseContextRequest({
    role: input.role,
    scope: input.scope,
    spotlightRef: input.spotlightRef,
  });

  const authorityExpiresAt = requireString(
    input.authorityExpiresAt,
    'decision.authorityExpiresAt',
  );
  const expiry = Date.parse(authorityExpiresAt);

  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    throw new Error('Warden decision is expired or has an invalid expiry');
  }

  return {
    decisionRef: requireString(input.decisionRef, 'decision.decisionRef'),
    principal: requireString(input.principal, 'decision.principal'),
    role: requestShape.role,
    scope: requestShape.scope,
    spotlightRef: requireString(
      requestShape.spotlightRef,
      'decision.spotlightRef',
    ),
    authorityExpiresAt,
  };
}

export class HttpWardenContextAuthorizer
  implements WardenContextAuthorizer
{
  readonly #options: HttpProviderOptions;

  constructor(options: HttpProviderOptions) {
    this.#options = options;
  }

  async listEligibleContexts(input: {
    principal: string;
  }): Promise<OperatingContextOption[] | undefined> {
    if (!this.#options.listPath) {
      return undefined;
    }

    const url = endpointFor(
      this.#options.baseUrl,
      this.#options.listPath,
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers(this.#options.bearerToken),
        'x-synnergyze-principal': input.principal,
      },
    });

    if (response.status === 501) {
      return undefined;
    }

    if (response.status === 404) {
      throw new Error(
        'Configured Warden context discovery endpoint was not found',
      );
    }

    if (!response.ok) {
      throw new Error(
        `Warden context discovery failed with HTTP ${response.status}`,
      );
    }

    const body = await readJson(response);
    const rawOptions =
      Array.isArray(body)
        ? body
        : body &&
            typeof body === 'object' &&
            Array.isArray((body as Record<string, unknown>).options)
          ? (body as Record<string, unknown>).options
          : undefined;

    if (!rawOptions) {
      throw new Error('Warden context discovery response must contain options');
    }

    return rawOptions.map((option, index) => {
      try {
        return parseContextOption(option);
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Warden context option[${index}] is invalid: ${detail}`,
        );
      }
    });
  }

  async authorize(input: {
    principal: string;
    request: ContextRequest;
  }): Promise<WardenAuthorizationResult> {
    const response = await fetch(
      endpointFor(this.#options.baseUrl, this.#options.path),
      {
        method: 'POST',
        headers: headers(this.#options.bearerToken),
        body: JSON.stringify(input),
      },
    );

    const body = await readJson(response);

    if (response.status === 403) {
      const reason =
        body &&
        typeof body === 'object' &&
        typeof (body as Record<string, unknown>).reason === 'string'
          ? String((body as Record<string, unknown>).reason)
          : 'Warden denied the requested context';

      return {
        authorized: false,
        reason,
      };
    }

    if (!response.ok) {
      throw new Error(
        `Warden context authorization failed with HTTP ${response.status}`,
      );
    }

    if (!body || typeof body !== 'object') {
      throw new Error('Warden authorization response must be an object');
    }

    const result = body as Record<string, unknown>;

    if (result.authorized !== true) {
      return {
        authorized: false,
        reason:
          typeof result.reason === 'string'
            ? result.reason
            : 'Warden did not authorize the requested context',
      };
    }

    return {
      authorized: true,
      decision: parseWardenDecision(result.decision),
    };
  }
}

export class HttpRiverContextObserver implements RiverContextObserver {
  readonly #options: HttpProviderOptions;

  constructor(options: HttpProviderOptions) {
    this.#options = options;
  }

  async recordTransition(
    event: ContextTransitionEvent,
  ): Promise<RiverTransitionReceipt> {
    const response = await fetch(
      endpointFor(this.#options.baseUrl, this.#options.path),
      {
        method: 'POST',
        headers: headers(this.#options.bearerToken),
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      throw new Error(
        `River context observation failed with HTTP ${response.status}`,
      );
    }

    const body = await readJson(response);
    if (!body || typeof body !== 'object') {
      throw new Error('River transition response must be an object');
    }

    return {
      riverSessionRef: requireString(
        (body as Record<string, unknown>).riverSessionRef,
        'riverSessionRef',
      ),
    };
  }
}
