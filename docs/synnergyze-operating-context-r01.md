# Synnergyze Operating Context R0.1

## Status

R0.1 implementation contract for Backstage Synnergyze.

## Decision

The same DigitalMe principal can operate in two task contexts:

- **Admin** — estate-wide perspective for governance and aggregate operations.
- **Developer** — bounded company, client, workspace or project perspective.

This is a context switch, not an identity switch.

## Canonical rule

```text
Admin = Estate perspective.
Developer = participant/company perspective.
DigitalMe remains constant.
Warden authorizes the active context and scope.
River records the transition and subsequent scoped actions.
Backstage permissions enforce the resolved context.
```

## Context object

```ts
type OperatingContext = {
  principal: string;

  role: 'admin' | 'developer';

  scope:
    | {
        type: 'estate';
        estateRef: string;
      }
    | {
        type: 'company';
        companyRef: string;
        workspaceRef?: string;
        projectRef?: string;
      };

  spotlightRef: string;
  wardenDecisionRef: string;
  authorityExpiresAt: string;
  riverSessionRef: string;
};
```

## Invariants

1. A frontend role selector never grants authority.
2. A Backstage catalog `spec.owner` field never grants runtime authority.
3. Every active context must reference a current Warden decision.
4. The Warden decision must be bounded by scope and expiry.
5. Admin may span an eligible Estate; Developer is scoped to a participant/company/workspace/project.
6. Every context activation or transition emits River evidence.
7. Search, navigation, billing, catalog queries and actions inherit the active context.
8. Provider-native systems remain authoritative for their native state.
9. No context transition changes the canonical DigitalMe identity.
10. Expired or revoked context resolves to no authority until Warden re-authorizes it.

## Search behavior

| Query | Admin context | Developer context |
| --- | --- | --- |
| billing | Consolidated eligible Estate billing | Current company/workspace billing |
| API errors | Eligible Estate APIs | Current scoped APIs |
| deployments | Estate deployment estate | Scoped company/project deployments |
| providers | Estate provider relationships | Providers used by current scope |
| usage | Aggregate resource consumption | Current company/workspace usage |
| evidence | Estate evidence index | Scoped evidence only |

## Backstage mapping

Backstage is the presentation, catalog and permission-enforcement surface.

- **Identity:** Backstage user identity maps to DigitalMe.
- **Context request:** UI requests Admin or Developer plus desired scope.
- **Authorization:** Warden resolves the request.
- **Permission input:** Warden decision reference, role, scope and expiry are presented to permission logic.
- **Resource filtering:** catalog/search/actions apply the active context as conditions.
- **Evidence:** River receives context transition and action observations.

```text
DigitalMe
   |
   v
Context request
   |
   v
Warden resolve
   |
   +--> DENY
   |
   v
Decision + TTL + scope
   |
   v
Backstage permission conditions
   |
   v
Scoped query/action
   |
   v
River observation
```

## R0.1 API

The catalog entity `api:default/synnergyze-operating-context-api` defines:

- `GET /context`
- `POST /context/resolve`
- `POST /context/transition`

Resolution does not automatically activate a context. Transition activates an already eligible context and creates River evidence.

## UI requirement

Every participating frontend must show the active context prominently.

Example Developer header:

```text
Spotlight: VOI Jeans        DEVELOPER
Catalog | APIs | Deployments | Usage | Billing | Evidence
```

Example Admin header:

```text
Spotlight: ALPHA ESTATE     ADMIN
Estate | Companies | Nodes | Providers | Policy | Economics
```

A hidden role or implicit global scope is not allowed.

## First proof case: billing

Billing is the first functional test because it clearly distinguishes scope.

### Developer

A query for billing resolves against the active company/workspace and returns only permitted usage, charges, invoices, credits and provider costs for that scope.

### Admin

A query for billing returns eligible consolidated Estate economics, with drill-down to company/provider/node subject to Warden policy.

## Implementation stages

### R0.1 — contract and catalog

- Operating Context API.
- UI, broker, observer and registry catalog entities.
- Backstage config overlay registration.
- Role/scope invariants.

### R0.2 — executable context broker

- Warden adapter.
- TTL and revocation handling.
- River transition event.
- server-side session/context binding.

### R0.3 — permission integration

- catalog conditional filters.
- search scoping.
- action authorization.
- billing proof case.

### R0.4 — context-aware shell

- visible Spotlight/context selector.
- Admin navigation.
- Developer navigation.
- company/workspace selector.
- context persistence bounded by Warden TTL.

## Acceptance criteria

R0.1 is accepted when:

1. Backstage loads both the existing commercial catalog and the operating-context catalog.
2. The API entity renders in Backstage.
3. Admin and Developer semantics are unambiguous.
4. A company billing request can be classified as Developer scope.
5. Consolidated Estate billing can be classified as Admin scope.
6. No static catalog ownership field is treated as authorization.
