# Synnergyze Operating Context R0.3 — Permission Enforcement

## Scope

R0.3 binds Warden-authorized operating context to Backstage permissions.

Enforced in this release:

- Catalog entity access.
- Catalog global/administrative operations.
- Synnergyze billing-read authorization.
- Permission-enforced billing query scope.

Enforced transitively through Backstage's permission-aware Search path:

- Catalog-backed Search result filtering.

Not yet claimed as enforced:

- Scaffolder action scoping.
- Kubernetes/resource-provider scoping.
- Frontend route/navigation hiding.

## Shared context service

R0.2 used a plugin-private in-memory context store. R0.3 promotes the active context to a root-scoped Backstage service:

`synnergyze.operating-context`

This gives the context broker and permission plugin one backend-wide view of the active Warden-authorized context while keeping Warden authoritative and River evidentiary.

## Policy

The previous allow-all permission module is removed from the refreshed backend and replaced with:

`@esomoire/backstage-plugin-permission-backend-module-synnergyze-context`

### No active context

Catalog and billing permissions are denied.

Other Backstage permissions remain allowed until explicitly migrated into the Warden policy surface. This prevents R0.3 from accidentally locking unrelated Backstage features while still removing allow-all behavior for the domains under active implementation.

### Admin context

Admin receives Estate-wide Catalog access inside this Backstage instance, subject to the active Warden decision and TTL.

```text
DigitalMe
  -> Warden ADMIN / estate scope
  -> shared context service
  -> permission policy
  -> Catalog ALLOW
```

### Developer context

Catalog entity permissions return a native Backstage conditional decision:

```text
HAS_ANNOTATION
  annotation = vsr.esomoire.io/company-ref
  value      = <active companyRef>
```

Therefore a Developer operating in:

`company:default/voi-jeans`

can only receive Catalog entities annotated:

```yaml
metadata:
  annotations:
    vsr.esomoire.io/company-ref: company:default/voi-jeans
```

If the active Developer context also carries `workspaceRef` and/or `projectRef`, the policy adds matching `vsr.esomoire.io/workspace-ref` and `vsr.esomoire.io/project-ref` conditions. Catalog visibility therefore narrows with the active operating context rather than remaining company-wide.

Global Catalog operations that cannot be resource-filtered remain Admin-only.

## Billing proof case

R0.3 defines:

`synnergyze.billing.read`

and adds:

`GET /api/synnergyze-context/billing/scope`

The endpoint invokes Backstage's permission service before returning any scope.

### Admin result

```json
{
  "mode": "estate",
  "estateRef": "estate:default/alpha",
  "spotlightRef": "...",
  "wardenDecisionRef": "...",
  "riverSessionRef": "..."
}
```

### Developer result

```json
{
  "mode": "company",
  "companyRef": "company:default/voi-jeans",
  "workspaceRef": "...",
  "spotlightRef": "...",
  "wardenDecisionRef": "...",
  "riverSessionRef": "..."
}
```

This response is a query-scope contract, not a billing ledger. A provider/billing adapter uses it to determine which provider-native billing data may be queried.

## Catalog proof fixtures

`catalog/vsr-company-billing-proof.yaml` contains two billing resources:

- VOI Jeans
- Esomoire

A VOI Developer context should receive only the VOI resource through Catalog conditional filtering. Admin should receive both.

## Search enforcement

The current Backstage Search backend wraps its engine with `AuthorizedSearchEngine` when `permission.enabled: true`.

The catalog collator publishes each search document with:

- `catalogEntityReadPermission` as the visibility permission, and
- the catalog entity reference as the authorization resource.

The BNR overlay now enables:

```yaml
permission:
  enabled: true
```

Therefore the Developer catalog conditional decision is evaluated against individual catalog-backed search results. A VOI Developer cannot receive an Esomoire catalog search result merely because it exists in the search index.

No custom Search fork is required for catalog-backed documents.

This statement applies only to document types that declare a visibility permission and authorization resource. New search document types must not be assumed scoped until they provide equivalent permission metadata.

## Acceptance criteria

R0.3 is accepted when:

1. The backend no longer installs the allow-all permission policy.
2. Catalog entity requests without an active context are denied.
3. Admin Catalog access is allowed under an active Estate context.
4. Developer Catalog decisions include the active company annotation condition.
5. Developer global Catalog administration is denied.
6. Billing scope cannot be resolved without `synnergyze.billing.read`.
7. Billing scope is derived from the same active context used by the policy.
8. A VOI Developer cannot retrieve the Esomoire proof resource through Catalog conditional authorization.
9. Catalog-backed Search is permission-aware and applies the same Developer company condition.

## Build note

R0.2 and R0.3 introduce new Yarn workspaces. Regenerate and commit `yarn.lock` on a normal repository install before merge/build validation.
