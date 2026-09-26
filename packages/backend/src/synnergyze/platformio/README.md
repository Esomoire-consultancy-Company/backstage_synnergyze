# PlatformIO Provider Adapter R0.1

This module begins governed admission of PlatformIO Core as a Device/Edge engineering provider.

## Reference baseline

- PlatformIO Core 6.2.1b2
- Snapshot date: 19 September 2026
- ZIP commit marker: `ff26956ecf0cdd44f6599894f11a83a93189e07f`

## Boundary

```text
PlatformIO Core
  -> PlatformIO Provider Adapter
  -> Synnergyze Capability Registry
  -> Genesis Local MCP
  -> Warden
  -> provider-native execution
  -> RiverOS evidence
  -> Genesis projection
  -> VSR Client Net
```

R0.1 intentionally admits only eight observation capabilities.

Installation does not imply admission.
Admission does not imply authorization.
No arbitrary `platformio.exec` or shell passthrough is defined.

Effect-producing operations such as build, upload, remote execution, package mutation, device monitor, and test execution remain outside this first admission slice.

PlatformIO accounts and credentials remain provider-native. DigitalMe identifies the VSR principal; Warden authorizes use; RiverOS records evidence. Provider secrets must not be copied into ordinary Genesis identity records.

This module is deliberately additive and isolated until it is qualified against the live Alpha-node provider-routing implementation.


## Reservation and reconciliation semantics

Effect admission uses a retry-safe reservation lifecycle:

- `EFFECT_CONFIRMED` -> commit the Warden reservation and continue to verification.
- `NO_EFFECT_CONFIRMED` -> release the reservation.
- `EFFECT_UNCERTAIN` -> commit the reservation, hold the attempt for reconciliation, and do not retry the mutation blindly.
- A durable idempotency key is derived from proposal, candidate, mutation type, and canonical target.
- If Genesis mutation succeeded but the response or River receipt was lost, reconciliation backfills evidence without repeating the mutation.
- Canonical truth still requires the independent post-admission verification step.

This preserves the rule that budgets/reservations are released only when `no_effect` is established.
