#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

YARN="node .yarn/releases/yarn-4.18.0.cjs"

echo "== Synnergyze Operating Context R0.5 Qualification =="
echo "root: $ROOT"
echo "node: $(node --version)"
echo "yarn: $($YARN --version)"

echo
echo "== 1. Dependency / lockfile reconciliation =="
$YARN install --mode=update-lockfile

echo
echo "== 2. Immutable install proof =="
$YARN install --immutable

echo
echo "== 3. Targeted package builds =="
for workspace in   @esomoire/backstage-plugin-synnergyze-context-common   @esomoire/backstage-plugin-synnergyze-context-node   @esomoire/backstage-plugin-synnergyze-context-backend   @esomoire/backstage-plugin-synnergyze-context-backend-module-alpha   @esomoire/backstage-plugin-permission-backend-module-synnergyze-context   @esomoire/backstage-plugin-synnergyze-context
do
  echo "-- build $workspace"
  $YARN workspace "$workspace" build
done

echo
echo "== 4. Targeted tests =="
for workspace in   @esomoire/backstage-plugin-synnergyze-context-common   @esomoire/backstage-plugin-synnergyze-context-node   @esomoire/backstage-plugin-synnergyze-context-backend   @esomoire/backstage-plugin-permission-backend-module-synnergyze-context   @esomoire/backstage-plugin-synnergyze-context
do
  echo "-- test $workspace"
  $YARN workspace "$workspace" test --runInBand
done

echo
echo "== 5. Targeted lint =="
for workspace in   @esomoire/backstage-plugin-synnergyze-context-common   @esomoire/backstage-plugin-synnergyze-context-node   @esomoire/backstage-plugin-synnergyze-context-backend   @esomoire/backstage-plugin-synnergyze-context-backend-module-alpha   @esomoire/backstage-plugin-permission-backend-module-synnergyze-context   @esomoire/backstage-plugin-synnergyze-context
do
  echo "-- lint $workspace"
  $YARN workspace "$workspace" lint
done

echo
echo "== 6. Integrated app/backend build =="
$YARN workspace example-app build
$YARN workspace example-backend build

echo
echo "== 7. Repository metadata checks =="
$YARN backstage-repo-tools generate-catalog-info --ci
$YARN prettier --check   packages/app/src/App.tsx   packages/app/src/modules/appModuleNav.tsx   packages/app/src/modules/appModuleSynnergyzeContext.tsx   plugins/synnergyze-context*   plugins/permission-backend-module-synnergyze-context   docs/synnergyze-operating-context-r0*.md   catalog/vsr-operating-contexts.yaml

echo
echo "R0.5 source qualification completed."
