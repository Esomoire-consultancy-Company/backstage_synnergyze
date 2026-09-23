# Synnergyze Source Registry R0.1

This registry separates three concerns that must not be conflated:

1. **Domain** — what business or technical reality is being observed.
2. **Surface** — where the observation or execution occurred.
3. **Signal** — what actually happened.

## Canonical domains

AI, Cloud, Commerce, Payments, Mobile, Telecom, App Data, Identity & Access,
Device / Edge, Location / Presence, Media / Content,
Messaging / Communications, Logistics / Fulfilment, Enterprise Systems,
and IoT / Sensors.

## Canonical observation surfaces

Browser, native app, desktop app, POS terminal, device OS, device sensor,
provider API, webhook, SDK, CLI, edge node, and network.

POS is intentionally a surface, not a domain. A single POS interaction may
emit Commerce, Payments, Inventory/App Data, or other domain signals.

Telecom is intentionally distinct from Mobile. Mobile describes the device /
OS / application environment. Telecom describes the carrier/network/line
relationship and communications transport.

## Control-plane rule

Synnergyze normalizes and orchestrates. It does not silently redefine provider
truth or authority:

- **Provider-native system**: authoritative execution result / receipt.
- **Warden**: authority, purpose, scope, conditions and expiry.
- **River**: observation, evidence, provenance and verification trail.
- **Synnergyze**: capability resolution, routing and normalized signal envelope.

An observed action must not create its own authority. Signals therefore carry
references to Warden decisions and River evidence rather than embedding a new
authorization model.

## Examples

Payment at a POS:

```text
domain       = PAYMENTS
surface      = POS_TERMINAL
signal       = AUTHORIZATION_APPROVED
signalClass  = TRANSACTION
```

eSIM activation:

```text
domain       = TELECOM
surface      = PROVIDER_API
signal       = ESIM_PROFILE_ACTIVATED
signalClass  = EVENT
```

Passkey authentication:

```text
domain       = IDENTITY_ACCESS
surface      = DEVICE_OS
signal       = PASSKEY_AUTHENTICATED
signalClass  = SESSION
```

AI inference:

```text
domain       = AI
surface      = PROVIDER_API
signal       = INFERENCE_COMPLETED
signalClass  = RECEIPT
```


## LocalStack capability discovery

The backend now includes a provider-discovery module for the Alpha LocalStack
runtime. Enable it with `app-config.localstack.yaml` and environment values
such as:

```text
SYNNERGYZE_NODE_ID=ALPHA-NODE-001
LOCALSTACK_ENDPOINT=http://localhost.localstack.cloud:4566
AWS_S3_ENDPOINT=http://s3.localhost.localstack.cloud:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Discovery reads LocalStack's `/_localstack/health` provider surface and
normalizes each discovered AWS-compatible capability into the canonical
Synnergyze taxonomy:

```text
domain      = CLOUD
surface     = PROVIDER_API
signal      = CAPABILITY_DISCOVERED
signalClass = STATE
provider    = localstack
execution   = EMULATED_LOCAL
```

Provider discovery is intentionally non-authoritative for Warden and River.
It reports provider runtime state only. A subsequent execution path must carry
the Warden decision reference, provider receipt, and River evidence references.
