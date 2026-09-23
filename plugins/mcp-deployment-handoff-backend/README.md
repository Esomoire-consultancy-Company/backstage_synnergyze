# MCP deployment handoff backend

Private, experimental first slice for MCP-HANDOFF-017. The domain service uses
process-local memory; restarting loses records. No routes, deployment operations,
database migrations, provider integrations, or implicit grants are installed.

The trusted backend composition supplies `createDeploymentHandoffPlugin` with a
receiver-owned `AcceptanceContract`, `WardenPort`, and `RiverPort`. Backend modules
can consume `deploymentHandoffExtensionPoint.service`. The service can also be
constructed directly with `DeploymentHandoffService.create` for unit tests.

The contract fixes receiver, location, scope, and a versioned contract reference.
The producer creates a `NOT_READY` handoff and submits upstream evidence to reach
`SUBMITTED`. Only the distinct receiver can begin `UNDER_REVIEW` and decide
`ACCEPTED` or `REJECTED`. Terminal decisions cannot be revised; create a new handoff
ID for a new attempt. Every decision evaluates the configured receiver contract
and records the receiver, reason, outcome, and contract reference.

Acceptance additionally requires nonblank Warden decision and River evidence
references and successful evaluations by both external ports. Submission may lack
these references, but such a handoff cannot be accepted. This slice intentionally
does not allow evidence edits after submission. Exceptions or negative evaluations
leave the handoff under review. Rejection needs a receiver reason and contract
evaluation, but does not claim Warden authorization or a River receipt.

Adapters must validate reference authenticity, authority, freshness, and binding
to the supplied handoff (including identities, location, scope, upstream evidence,
and contract reference). A reference string is not proof. The contract must check
the expected dependency set and evidence semantics. Unit-test adapter responses
are test doubles, not external authority decisions or River receipts.

Caller-supplied actor strings are a trusted domain boundary, not authentication.
An eventual transport must derive the actor from verified credentials and apply
read access controls; never forward an actor from a producer request body. Only
trusted receiver composition may configure contracts and adapters. No HTTP API is
exposed by this slice.

Provider-native observations stay in `evidence.externalEffects`; even `READY` or
`ACCEPTED` there never advances canonical state. Copies isolate records from caller
or adapter mutation. Snapshot comparison prevents concurrent evaluations from
overwriting a terminal decision in this process. Multi-process persistence would
need atomic revision checks in a repository.

The existing root `plugins/*` workspace glob includes this private package; no
root metadata or publication changeset is needed. In a fully installed checkout,
run `CI=1 yarn test plugins/mcp-deployment-handoff-backend` and the package lint
script. Run `yarn tsc` from the repository root for type checking.
