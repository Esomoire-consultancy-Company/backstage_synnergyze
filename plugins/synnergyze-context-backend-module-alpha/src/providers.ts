import {
  ContextRequest,
  ContextTransitionEvent,
  parseContextRequest,
  RiverTransitionReceipt,
  WardenAuthorizationResult,
  WardenContextDecision,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import {
  RiverContextObserver,
  WardenContextAuthorizer,
} from '@esomoire/backstage-plugin-synnergyze-context-node';

type HttpProviderOptions = {
  baseUrl: string;
  path: string;
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

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
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

    const body = (await response.json()) as unknown;

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

    const body = (await response.json()) as unknown;
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
