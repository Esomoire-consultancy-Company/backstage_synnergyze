# Synnergyze Operating Context R0.2 — Executable Broker

## Scope

R0.2 promotes the R0.1 contract into executable Backstage packages on the refreshed upstream baseline.

Packages:

- `@esomoire/backstage-plugin-synnergyze-context-common`
- `@esomoire/backstage-plugin-synnergyze-context-node`
- `@esomoire/backstage-plugin-synnergyze-context-backend`
- `@esomoire/backstage-plugin-synnergyze-context-backend-module-alpha`

The backend app registers both the broker and the Alpha adapter module.

## Security invariants

1. Backstage authentication establishes the acting user principal.
2. The frontend cannot grant Admin or Developer authority.
3. Warden must authorize every resolve/transition request.
4. The returned Warden principal must equal the authenticated Backstage principal.
5. Warden decisions must carry a non-expired TTL.
6. Admin requires Estate scope.
7. Developer requires Company scope.
8. River observation must succeed before a context becomes active.
9. If Warden or River is not configured, the broker fails closed.
10. Context state is not a substitute for Backstage permission policy; permission integration remains R0.3.

## Runtime routes

Mounted under the Backstage plugin route for `synnergyze-context`:

- `GET /context` — current active context for the authenticated principal.
- `POST /context/resolve` — Warden evaluation without activation.
- `POST /context/transition` — Warden authorization, River observation, then activation.
- `GET /health` — reports whether authorization and observation providers are registered.

## Transition sequence

```text
Authenticated Backstage User
        |
        v
DigitalMe-compatible principal
        |
        v
ContextRequest
        |
        v
Warden authorize
        |
        +---- deny ----> 403
        |
        v
Warden decision + scope + TTL
        |
        v
River context-transition observation
        |
        +---- fail ----> no activation
        |
        v
River receipt / session reference
        |
        v
Active OperatingContext
```

The evidence-before-activation ordering is intentional.

## Alpha adapter configuration

Endpoint values are deployment-specific. Do not commit credentials.

```yaml
synnergyze:
  context:
    warden:
      baseUrl: https://warden.example.internal
      authorizePath: /authorize
      bearerToken: ${SYN_CONTEXT_WARDEN_TOKEN}
    river:
      baseUrl: https://river.example.internal
      transitionPath: /events/context-transition
      bearerToken: ${SYN_CONTEXT_RIVER_TOKEN}
```

Both sections are optional at configuration-parse time. Missing providers cause runtime context operations to fail closed.

## Warden adapter contract

Request:

```json
{
  "principal": "user:default/example",
  "request": {
    "role": "developer",
    "scope": {
      "type": "company",
      "companyRef": "company:default/example-company"
    },
    "spotlightRef": "spotlight:example-company"
  }
}
```

Authorized response:

```json
{
  "authorized": true,
  "decision": {
    "decisionRef": "warden:decision:123",
    "principal": "user:default/example",
    "role": "developer",
    "scope": {
      "type": "company",
      "companyRef": "company:default/example-company"
    },
    "spotlightRef": "spotlight:example-company",
    "authorityExpiresAt": "2026-09-22T12:00:00.000Z"
  }
}
```

Denied response may use HTTP 403 or an `authorized: false` body with a reason.

## River adapter contract

The broker posts a `synnergyze.context.transitioned` event containing:

- event ID and timestamp,
- authenticated principal,
- previous context when present,
- full Warden decision.

River must return:

```json
{
  "riverSessionRef": "river:session:..."
}
```

A missing or empty River reference is rejected.

## Current storage model

R0.2 uses an in-memory active-context store per Backstage backend process. It enforces TTL on reads and drops expired contexts.

This is intentionally not yet a durable source of truth. Warden remains the authority and River remains the evidence source. Durable/reconnect context binding can be introduced after the permission model and replay contract are fixed.

## R0.3 handoff

R0.3 should add:

- Backstage permission-policy conditions derived from active context,
- catalog and search scoping,
- billing proof case,
- context-aware action authorization,
- permission tests proving Developer cannot escape company scope,
- Admin Estate scope bounded by Warden policy.

## Build note

This branch introduces new Yarn workspaces. The repository connector cannot deterministically regenerate `yarn.lock`; run the repository's normal Yarn install on the refreshed branch and commit the resulting lockfile delta before merge.
