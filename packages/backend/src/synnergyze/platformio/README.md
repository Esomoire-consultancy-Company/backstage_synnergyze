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
