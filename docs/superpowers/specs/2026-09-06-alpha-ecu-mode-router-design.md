# Alpha ECU Mode Router R0.1 — Design

**Status:** Proposed implementation specification  
**Date:** 2026-09-06  
**Target repository:** `Esomoire-consultancy-Company/backstage_synnergyze`  
**Target branch:** `feat/alpha-ecu-mode-router-r0-1`

## 1. Purpose

Alpha ECU Mode Router R0.1 provides one deterministic control-plane resolver for requests entering the shared Alpha ECU through Believers Common, VSR, BNR, Creators Common, Alpha control surfaces, and configured enterprise domains.

The router answers four questions before any domain-specific handler executes:

1. Which governed operating mode applies to this request?
2. Which capability pack is available in that mode?
3. Which Warden policy pack and disclosure pack must govern the next step?
4. Is a requested cross-mode transition structurally admissible?

R0.1 is intentionally **not** an execution engine. It does not mutate Genesis state, execute Synnergyze workflows, settle through SILK, or create River evidence records. It produces a typed, auditable routing decision that downstream services may use only after their own authority checks.

## 2. Architectural decision

Implement the router as a dedicated Backstage backend plugin rather than placing host-switching logic in `packages/backend/src/index.ts`.

The current backend entrypoint is a composition root that adds Backstage plugins and starts the backend. It should remain a composition root. The ECU router will be a new isolated plugin package and the backend entrypoint will only register that plugin.

### Alternatives considered

**A. Inline hostname switch in `packages/backend/src/index.ts` — rejected.**  
Fastest initially, but it couples domain routing, Warden policy references, tenant scope, and disclosure behavior to the Backstage bootstrap. It becomes difficult to test and encourages the application entrypoint to accumulate authority logic.

**B. Dedicated Backstage backend plugin — selected.**  
Fits the repository's current backend-plugin architecture, keeps the subsystem testable, allows the router to use Backstage core services, and preserves a clean boundary between Backstage composition and ECU behavior.

**C. Separate edge/gateway service — deferred.**  
May become appropriate when Alpha spans several physical nodes or requires independent edge scaling. R0.1 does not need a second deployment unit; the domain/mode contract should be stable enough to extract later without changing callers.

## 3. Fundamental rule

`Mode Router != Warden`.

The router may classify context and select policy references. It must never treat a resolved mode, authenticated Backstage identity, configured domain, or Backstage permission result as sufficient authority for an external side effect.

The current Backstage backend includes the allow-all permission policy module. That permission layer must not be interpreted as Warden authorization. ECU execution remains denied until a Warden decision is obtained by a downstream executor.

## 4. R0.1 scope

### Included

- Canonical ECU mode identifiers.
- Config-backed mode registry.
- Config-backed domain bindings.
- Normalized request envelope.
- Trusted-host mode resolution.
- Capability-pack reference resolution.
- Warden-policy-pack reference resolution.
- Disclosure-pack reference resolution.
- Enterprise tenant binding for explicitly configured client domains.
- Structural cross-mode transition validation.
- HTTP endpoint to resolve an ECU context without side effects.
- Health/readiness endpoint.
- Structured logs for route decisions using non-sensitive identifiers.
- Unit and backend integration tests.

### Excluded

- Genesis writes.
- Synnergyze execution.
- Route Compiler path optimization.
- River evidence persistence.
- SILK settlement.
- DigitalMe credential issuance.
- Warden policy evaluation itself.
- Browser redirects or frontend navigation.
- Dynamic tenant onboarding from arbitrary hostnames.
- Wildcard public-domain admission.

## 5. Canonical modes

R0.1 defines these mode IDs:

```ts
export type AlphaEcuModeId =
  | 'BELIEVERS_COMMON'
  | 'VSR_PUBLIC'
  | 'BNR'
  | 'CREATORS_COMMON'
  | 'ALPHA_CONTROL'
  | 'ENTERPRISE';
```

`ENTERPRISE` is further scoped by `tenantId`; tenant identity is not encoded into the enum.

## 6. Initial mode profiles

Each profile is data, not branching application code.

### BELIEVERS_COMMON

- realm: `PUBLIC_COMMONS`
- capability pack: `BC-PACK-R0.1`
- Warden policy pack: `WARDEN-BC-PUBLIC-R0.1`
- disclosure pack: `DISCLOSURE-BC-PUBLIC-R0.1`
- public projection: allowed subject to disclosure pack
- private enterprise projection: denied

### VSR_PUBLIC

- realm: `PUBLIC_NETWORK`
- capability pack: `VSR-PACK-R0.1`
- Warden policy pack: `WARDEN-VSR-PUBLIC-R0.1`
- disclosure pack: `DISCLOSURE-VSR-PUBLIC-R0.1`
- public network discovery: allowed
- private enterprise projection: denied unless a separately authorized transition occurs

### BNR

- realm: `NETWORK_ROUTING`
- capability pack: `BNR-PACK-R0.1`
- Warden policy pack: `WARDEN-BNR-R0.1`
- disclosure pack: `DISCLOSURE-BNR-R0.1`
- regional routing context: allowed

### CREATORS_COMMON

- realm: `CREATOR_COMMONS`
- capability pack: `CC-PACK-R0.1`
- Warden policy pack: `WARDEN-CC-R0.1`
- disclosure pack: `DISCLOSURE-CC-R0.1`

### ALPHA_CONTROL

- realm: `CONTROL_PLANE`
- capability pack: `ALPHA-CONTROL-PACK-R0.1`
- Warden policy pack: `WARDEN-ALPHA-CONTROL-R0.1`
- disclosure pack: `DISCLOSURE-ALPHA-CONTROL-R0.1`
- must never be selected from an unknown or wildcard hostname

### ENTERPRISE

- realm: `PRIVATE_ENTERPRISE`
- capability pack: tenant-configured, default `ENTERPRISE-PACK-R0.1`
- Warden policy pack: tenant-configured
- disclosure pack: tenant-configured
- `tenantId` required
- no enterprise domain may resolve without an explicit domain-to-tenant binding

## 7. Domain bindings

R0.1 reads bindings from Backstage configuration under `alphaEcu.modeRouter`.

Example schema:

```yaml
alphaEcu:
  modeRouter:
    trustedProxy: true
    bindings:
      - host: believerscommon.com
        mode: BELIEVERS_COMMON
      - host: vsr.believerscommon.com
        mode: VSR_PUBLIC
      - host: bnr.believerscommon.com
        mode: BNR
      - host: alpha.believerscommon.com
        mode: ALPHA_CONTROL
      - host: creators-common.org
        mode: CREATORS_COMMON
      - host: client.example.com
        mode: ENTERPRISE
        tenantId: CLIENT-001
        capabilityPack: ENTERPRISE-PACK-R0.1
        wardenPolicyPack: WARDEN-CLIENT-001-R0.1
        disclosurePack: DISCLOSURE-CLIENT-001-R0.1
```

The example client host is illustrative configuration, not a default shipped binding.

Bindings are exact hostnames in R0.1. Wildcards are not supported.

## 8. Host trust and normalization

The router must not trust arbitrary caller-supplied mode headers.

Resolution rules:

1. Determine the effective host from the request using a configured proxy trust policy.
2. Normalize to lowercase ASCII hostname.
3. Remove a trailing dot.
4. Reject malformed hosts and hosts containing a path, scheme, userinfo, or embedded whitespace.
5. Ignore the port for binding lookup.
6. Match the normalized host to exactly one configured binding.
7. Unknown host -> `UNKNOWN_HOST` and no mode.
8. Duplicate binding at startup -> configuration failure.

`X-ECU-Mode`, query parameters, and request bodies cannot override the resolved mode in R0.1.

## 9. Request envelope

The public resolver accepts a normalized subset of the full Alpha ECU envelope:

```ts
export interface AlphaEcuResolveRequest {
  requestId: string;
  intent?: string;
  workspaceId?: string;
  requestedTransition?: {
    toMode: AlphaEcuModeId;
    tenantId?: string;
    purpose: string;
  };
}
```

The network-derived source context is added server-side:

```ts
export interface AlphaEcuSourceContext {
  host: string;
  interface: 'web' | 'api' | 'mcp' | 'internal';
}
```

The router does not accept a `digitalmeId` in an unauthenticated body as proof of identity. Identity enrichment belongs to a later authenticated principal adapter.

## 10. Resolution result

```ts
export interface AlphaEcuModeContext {
  requestId: string;
  mode: AlphaEcuModeId;
  realm: AlphaEcuRealm;
  tenantId?: string;
  capabilityPack: string;
  wardenPolicyPack: string;
  disclosurePack: string;
  publicProjection: boolean;
  executionAuthority: 'DENIED_UNTIL_WARDEN';
  transition?: AlphaEcuTransitionDecision;
}
```

Every successful R0.1 result carries `executionAuthority: 'DENIED_UNTIL_WARDEN'`. This is an invariant, not configurable behavior.

## 11. Transition model

A transition is a request to move an operation from one operating context to another. The router only answers whether that transition is structurally recognized; it does not authorize the transfer of data or authority.

```ts
export type AlphaEcuTransitionDecision =
  | {
      status: 'STRUCTURALLY_ADMISSIBLE';
      fromMode: AlphaEcuModeId;
      toMode: AlphaEcuModeId;
      requiresWarden: true;
      requiresDisclosureEvaluation: true;
    }
  | {
      status: 'REJECTED';
      reason:
        | 'TRANSITION_NOT_DECLARED'
        | 'TENANT_REQUIRED'
        | 'TENANT_MISMATCH'
        | 'CONTROL_PLANE_ESCALATION_FORBIDDEN';
    };
```

Initial structural transition matrix:

| From | To | R0.1 structural result |
|---|---|---|
| BELIEVERS_COMMON | VSR_PUBLIC | admissible |
| BELIEVERS_COMMON | ENTERPRISE | admissible only with target tenant |
| VSR_PUBLIC | ENTERPRISE | admissible only with target tenant |
| BNR | VSR_PUBLIC | admissible |
| CREATORS_COMMON | VSR_PUBLIC | admissible |
| ENTERPRISE | VSR_PUBLIC | admissible |
| any public/enterprise mode | ALPHA_CONTROL | rejected |
| ALPHA_CONTROL | any mode | admissible structurally, still requires Warden |
| ENTERPRISE tenant A | ENTERPRISE tenant B | rejected in R0.1 |

A later version may move this matrix into Warden policy; R0.1 keeps a minimal structural safety matrix so obviously invalid context escalation fails before authority evaluation.

## 12. Public/private projection invariant

Mode resolution must preserve the distinction between public-commons projection and private enterprise state.

The router returns disclosure-pack references but no private data. In particular:

- BELIEVERS_COMMON cannot directly expose enterprise inventory, prices, contacts, telemetry, payroll, machine state, or private contracts.
- VSR_PUBLIC may advertise governed capability availability, not the private source record by default.
- ENTERPRISE receives no BC/Creators private participant data merely because a cross-mode route exists.
- Cross-mode data release requires Warden plus disclosure evaluation downstream.

## 13. Plugin structure

Create one backend plugin package:

```text
plugins/alpha-ecu-mode-router-backend/
  package.json
  src/
    index.ts
    plugin.ts
    types.ts
    config.ts
    registry.ts
    host.ts
    transition.ts
    router.ts
    __tests__/
      config.test.ts
      registry.test.ts
      host.test.ts
      transition.test.ts
      router.test.ts
```

Responsibilities:

- `types.ts`: stable public contracts and enums/unions.
- `config.ts`: strict config parsing and duplicate detection.
- `registry.ts`: immutable mode/domain registry and lookup.
- `host.ts`: host normalization and trusted-source extraction.
- `transition.ts`: structural transition rules.
- `router.ts`: HTTP routes and input/output validation.
- `plugin.ts`: Backstage `createBackendPlugin` registration.
- `index.ts`: package exports/default plugin export.

`packages/backend/src/index.ts` gains exactly one plugin registration import. It must not contain domain tables or policy decisions.

## 14. HTTP surface

### `GET /health`

Returns plugin readiness only:

```json
{
  "status": "ok",
  "registryLoaded": true
}
```

### `POST /resolve`

Consumes `AlphaEcuResolveRequest` and derives host context from the HTTP request.

Success: HTTP 200 with `AlphaEcuModeContext`.

Failure mapping:

- `400 INVALID_REQUEST`
- `400 INVALID_HOST`
- `404 UNKNOWN_HOST`
- `409 AMBIGUOUS_BINDING` (startup validation should make this unreachable in normal operation)
- `422 TRANSITION_REJECTED`
- `500 INVALID_ROUTER_CONFIGURATION`

No R0.1 endpoint performs an external side effect.

## 15. Observability

Log one structured resolution event per request:

```json
{
  "event": "alpha_ecu_mode_resolved",
  "requestId": "REQ-123",
  "mode": "BELIEVERS_COMMON",
  "tenantId": null,
  "transitionStatus": null
}
```

Do not log raw authorization headers, cookies, request bodies, private enterprise data, or participant personal information.

Metrics planned for the plugin:

- `alpha_ecu_mode_resolve_total{mode,result}`
- `alpha_ecu_mode_unknown_host_total`
- `alpha_ecu_transition_total{from,to,result}`

If adding metrics requires extra dependencies beyond the existing backend telemetry stack, metrics may be emitted through the existing Backstage/OpenTelemetry facilities; no separate telemetry runtime should be introduced for R0.1.

## 16. Failure semantics

The router fails closed.

- Missing registry -> backend initialization fails.
- Duplicate normalized host -> backend initialization fails.
- Unknown host -> no default mode.
- Missing enterprise tenant -> configuration failure or rejected resolution.
- Unknown requested mode -> invalid request.
- Attempt to escalate into `ALPHA_CONTROL` -> rejected.
- Downstream Warden unavailable -> outside R0.1; caller still has `DENIED_UNTIL_WARDEN` and therefore cannot treat the mode result as execution authority.

There is no `PUBLIC` fallback and no `ENTERPRISE` fallback.

## 17. Configuration validation invariants

At startup:

1. Every binding has one exact normalized hostname.
2. Every binding references one known mode.
3. `ENTERPRISE` requires `tenantId`.
4. Non-enterprise bindings must not contain `tenantId`.
5. Every binding resolves exactly one capability pack, Warden policy pack, and disclosure pack.
6. `ALPHA_CONTROL` cannot be bound using wildcard syntax.
7. Duplicate normalized hosts are invalid.
8. No profile may change `executionAuthority` from `DENIED_UNTIL_WARDEN`.

## 18. Testing strategy

### Unit tests

- Host normalization: case, ports, trailing dot, malformed input.
- Config validation: duplicate host, unknown mode, missing enterprise tenant, illegal tenant on public mode.
- Registry: exact-match resolution and unknown host failure.
- Transition matrix: all declared transitions plus control-plane escalation rejection.
- Invariant: every successful result is `DENIED_UNTIL_WARDEN`.

### Backend integration tests

Using Backstage backend test utilities:

1. Start plugin with test config.
2. Resolve `believerscommon.com` -> `BELIEVERS_COMMON`.
3. Resolve `vsr.believerscommon.com` -> `VSR_PUBLIC`.
4. Resolve configured enterprise host -> `ENTERPRISE` and correct `tenantId`.
5. Unknown host -> 404.
6. BC -> enterprise transition without tenant -> 422.
7. BC -> ALPHA_CONTROL -> 422.
8. Confirm resolver causes no persistence or external network call.

## 19. Security boundaries

R0.1 deliberately does not solve user identity. The router may later consume a server-verified DigitalMe principal, but it will never accept a self-asserted identity as authority.

The effective hostname is security-relevant. Deployments behind a reverse proxy must configure proxy trust deliberately. Direct public deployments must use the direct Host header. A forwarded host is not trusted merely because the header is present.

The router's output is context metadata, not an authorization token.

## 20. Backward compatibility and rollout

R0.1 is additive.

- Existing Backstage plugins remain registered.
- Existing app routes continue to operate.
- The router is introduced under its own backend plugin namespace.
- No existing domain is redirected by this plugin.
- No existing database migration is required.
- No Genesis/Warden/River/SILK endpoint is required to run the R0.1 resolver tests.

Once R0.1 is stable, the next version can add a Warden adapter that consumes `AlphaEcuModeContext` and returns `ADMIT | DENY | DEFER | ESCALATE` for a requested capability. That adapter must remain a separate authority boundary.

## 21. Acceptance criteria

R0.1 is complete when:

1. The backend loads the Alpha ECU mode-router plugin successfully.
2. Exact configured domains deterministically resolve to the intended mode.
3. Enterprise domains always resolve with an explicit tenant.
4. Unknown domains fail closed.
5. No caller can override a mode using body/query/header mode claims.
6. Public/enterprise contexts receive the correct capability, Warden policy, and disclosure pack references.
7. Cross-mode structural rules reject direct escalation to `ALPHA_CONTROL`.
8. Every successful mode context states `DENIED_UNTIL_WARDEN`.
9. Tests cover the configuration, resolution, transition, and HTTP behavior.
10. The plugin performs no Genesis write, Synnergyze execution, River persistence, or SILK settlement.
