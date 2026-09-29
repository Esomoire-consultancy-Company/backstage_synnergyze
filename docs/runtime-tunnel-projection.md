# Runtime tunnel projection contract

The Estate Control Tower renders RUNTIME-TUNNEL-101 as:

`ORIGIN_LIGHT (1A) -> SILK DAM entry -> TUNNEL_DARK (0) -> SILK DAM exit -> RETURN_LIGHT (1B)`

Stage provides the estate context, Glass presents the same observed journey, and
Spotlight selects an evidence frame. SPOTLIGHT-PULSE-010 is a separate presentation
cycle: peripheral dark -> illuminated -> peripheral dark. Inspecting a frame or
advancing the Sentinel Clock never records passage or completes a journey.

## Ownership and trust boundary

Genesis owns subject identity; River owns Story chronology and evidence; Warden
owns permitted interpretation and passage; SILK DAM owns thresholds and gates.
Sentinel owns no canonical records. This implementation has no storage, event
writer, gate mutation, authorization issuer, or replacement registry.

The UI reads an optional Backstage proxy route:

`GET /api/proxy/vsr-runtime-tunnel?subjectRef=ALPHA-NODE-001`

This is a NEW consumer integration seam, not an assertion that River currently
implements this endpoint. Configure it only against a service that authenticates
the requesting DigitalMe, checks Warden for this subject and Story, resolves the
Genesis/River/SILK references, and filters disclosure before sending the response.
A proxy and a client-side permitted flag are NOT authorization enforcement.
Do not connect an unrestricted event listing or forward a shared service token as
proof of user authority. The upstream should permit GET only and send no-store
responses. Backend discovery and FetchApi carry Backstage's existing transport
and authentication behavior; no credentials belong in the snapshot.

A successful response has this shape (references below are illustrative):

```json
{
  "contract": "RUNTIME-TUNNEL-101",
  "subjectRef": "ALPHA-NODE-001",
  "storyRef": "river:story:example",
  "revision": "r1",
  "observedAt": "2026-09-25T10:00:00Z",
  "validUntil": "2026-09-25T10:01:00Z",
  "interpretation": {
    "decisionRef": "warden:interpretation:example",
    "permitted": true
  },
  "observations": [
    {
      "step": "ORIGIN_LIGHT",
      "observedAt": "2026-09-25T09:59:00Z",
      "evidenceRef": "river:event:example",
      "summary": "Initial observation"
    }
  ]
}
```

Observations must form a contiguous prefix of the five journey positions. Entry and exit are observed boundaries, not additional canonical states; the projected phase remains ORIGIN_LIGHT at entry and TUNNEL_DARK at exit until River records the next state. Each
observation needs a distinct evidence reference and nondecreasing event time.
Entry and exit additionally require `gateRef` and `passageDecisionRef`, resolved
by the upstream to the correct subject, Story, gate and historical permission.
Presence of these strings only validates response structure; it does not verify
the underlying receipts or confer authority. A new traversal uses a new Story.
A later revision can correct the view; the client does not write reconciliation.

`observedAt` is the source observation time, never the browser fetch time.
`validUntil` is an upstream freshness boundary, not a Warden grant issued by
Sentinel. Sentinel evaluates [observedAt, validUntil) using its supplied clock.
At expiry the last recorded phase remains explicitly STALE; time never creates
RETURN_LIGHT. Future snapshots are suppressed rather than replaying future facts.
Restricted, malformed, wrong-subject or unavailable sources reveal no Story.
Network failure clears the projection. Clock skew produces a FUTURE state.
The client refreshes every 30 seconds, expires observations every second, uses
no-store requests, aborts after 10 seconds, and prevents overlapping requests.

## Alpha validation boundary

On 25 September 2026 River /health, Prometheus /-/healthy and Grafana /api/health
responded 200. Prometheus reported prometheus=1 and river-api=1. This confirms
service availability only, not a tunnel, gate, permission, or Story.

The running Backstage on port 7007 returned 404 for vsr-river, vsr-prometheus,
and vsr-runtime-tunnel proxy routes. River's published OpenAPI exposes events,
receipts and Matter state, but no Story/tunnel projection endpoint. The feature
branch therefore differs from the deployed runtime. No live deployment or
canonical source mutation is part of this patch. A real authorized Story
round trip remains required before claiming live end-to-end completion.

PR #8 at 9bcfd176b854af2c89d20dee8998f6973adf4743 also had a backend
registration type error, formatting failures, and a failed FOSSA job. The
registration error comes from dynamically importing a named plugin export as
if it were a default export. The patch resolves that existing startup blocker.
Unrelated formatting files are not rewritten.

On 29 September, the integration was reconciled with PR revision 8e857a74c2.
The existing VsrRuntimeTunnelPanel export is preserved and delegates to the
validated read-model view; there is only one rendered tunnel. Warden on port
8010 exposes context, capability, handoff and return-path APIs, but no Story
projection endpoint. The alternative configured Backstage port 7013 refused
connections when checked. These observations do not authorize minting a new
Warden grant or treating raw River events as an admitted Story.
