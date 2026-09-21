# Synnergyze Operating Context prototype

This directory contains the implementation-neutral R0.1 contract while the Backstage fork is being refreshed against upstream.

It is intentionally outside `packages/*` and `plugins/*` so this contract can be reviewed without introducing a new Yarn workspace into a fork that is materially behind upstream.

The next step after the Backstage base refresh is to promote this contract into:

- `plugins/synnergyze-context-common`
- `plugins/synnergyze-context`
- `plugins/synnergyze-context-backend`

The canonical API and catalog model are already registered under `catalog/vsr-operating-contexts.yaml`.
