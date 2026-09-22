# Synnergyze Operating Context R0.4 — Spotlight Shell

## Scope

R0.4 makes the active operating context visible and selectable throughout the Backstage frontend without moving authority into the UI.

The same DigitalMe/Backstage principal remains active. The user selects a requested operating context; Warden resolves authority; River records the transition; the frontend only reflects the resulting state.

## Frontend package

R0.4 adds:

`@esomoire/backstage-plugin-synnergyze-context`

The package provides:

- `synnergyzeContextApiRef`
- `SynnergyzeContextClient`
- `OperatingContextProvider`
- `SpotlightContextRibbon`
- `SpotlightContextControl`

The refreshed app registers the plugin through the new Backstage frontend system.

## Global visibility

The app root is wrapped by `OperatingContextProvider`.

Every page therefore has access to one shared frontend view of the active backend operating context.

A fixed Spotlight ribbon displays:

```text
Spotlight: <scope> • ADMIN
```

or:

```text
Spotlight: <scope> • DEVELOPER
```

The sidebar also exposes the interactive Spotlight control.

If no active context exists, the ribbon shows `NO CONTEXT`.

If context refresh fails or the local expiry time has passed, the ribbon presents a degraded/warning state. Backend authorization remains authoritative regardless of frontend display state.

## Safe transition UX

Context switching is deliberately two-stage:

```text
select/request scope
      ↓
Preview with Warden
      ↓
authorized decision + TTL
      ↓
Activate
      ↓
backend re-authorizes
      ↓
River observation
      ↓
active context
```

The preview does not grant authority.

The Activate button is enabled only when:

1. Warden preview returned `authorized: true`,
2. the form still matches the exact previewed request, and
3. the preview TTL has not expired.

The backend still performs a new Warden authorization during transition, so frontend preview state is never the execution authority.

## Eligible-context discovery

R0.4 adds:

`GET /api/synnergyze-context/context/options`

The backend asks the registered Warden authorizer for context candidates tied to the authenticated principal.

Alpha HTTP adapter configuration:

```yaml
synnergyze:
  context:
    warden:
      baseUrl: https://warden.example.internal
      authorizePath: /authorize
      optionsPath: /contexts
```

`optionsPath` is opt-in. If it is omitted, the Backstage endpoint reports `discoveryAvailable: false` and manual scope entry remains available.

For discovery calls, the backend sends the authenticated principal to Warden in the `x-synnergyze-principal` request header rather than placing the principal in the URL.

The **upstream Warden** discovery response may be either an array or:

```json
{
  "options": [
    {
      "id": "voi-developer",
      "label": "VOI Jeans — Developer",
      "role": "developer",
      "scope": {
        "type": "company",
        "companyRef": "company:default/voi-jeans"
      },
      "spotlightRef": "spotlight:voi-jeans"
    }
  ]
}
```

These entries are selectable candidates only. Selecting one does not bypass Warden preview or transition authorization.

The **Backstage** endpoint always normalizes discovery to:

```json
{
  "discoveryAvailable": true,
  "options": [
    {
      "id": "voi-developer",
      "label": "VOI Jeans — Developer",
      "role": "developer",
      "scope": {
        "type": "company",
        "companyRef": "company:default/voi-jeans"
      }
    }
  ]
}
```

When discovery is not configured or Warden explicitly reports it unsupported:

```json
{
  "discoveryAvailable": false,
  "options": []
}
```

If no Warden authorizer is configured, the endpoint returns `503`. If a configured Warden discovery call fails or is malformed, Backstage returns a controlled `502` error.

If Warden discovery is unsupported, the UI allows manual scope entry. Manual requests are subject to the same Warden preview and transition gates.

## Context hierarchy

Developer scope can progressively narrow:

```text
Company
  └── Workspace
        └── Project
```

The selector supports all three references.

Admin scope remains Estate-based.

## Context refresh

The frontend reloads the active context periodically, after a successful transition, and at the exact local Warden TTL expiry boundary.

The backend context service remains TTL-aware; an expired context disappears on read.

The frontend does not locally extend, renew or fabricate authority.

## App integration

R0.4 installs:

- the Synnergyze frontend plugin,
- an app-root context wrapper,
- the Spotlight ribbon,
- the sidebar Spotlight control,
- context-aware navigation.

Navigation is presentation, not authorization. In Admin context the main operating group is labelled **Estate** and exposes Estate-oriented tooling; in Developer context it is labelled **Workspace** and exposes the scoped build/scaffolder surface. R0.3 permissions remain the enforcement boundary even if a route is reached directly.

This avoids editing Backstage core UI primitives.

## Acceptance criteria

R0.4 is accepted when:

1. the active role/scope is visible from every page,
2. no-context state is visibly distinct,
3. Admin and Developer can be requested from one DigitalMe identity,
4. eligible contexts can be discovered from Warden when supported,
5. manual scope input remains possible without becoming authoritative,
6. context preview cannot activate after the request is edited,
7. expired preview cannot activate,
8. transition is re-authorized server-side and River-observed,
9. successful transition refreshes the shared frontend state,
10. frontend display failure cannot widen backend permissions,
11. navigation visibly reflects Admin/Developer context without becoming the authorization layer,
12. frontend state refreshes at Warden authority expiry rather than waiting only for the polling interval.

## Build note

R0.2–R0.4 introduce new Yarn workspaces. The existing lockfile regeneration/build/lint gate remains required before merge.
