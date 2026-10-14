#!/usr/bin/env sh
# ADR-0020: fails when Payload collections changed without a committed migration.
# Requires a database that has all committed migrations applied.
set -eu
cd "$(dirname "$0")/.."
before=$(ls src/migrations)
pnpm payload migrate:create drift_check --skip-empty >/dev/null
after=$(ls src/migrations)
if [ "$before" != "$after" ]; then
  echo "✗ Schema drift: Payload config changed without a migration. Run: pnpm --filter @fp/web migrate:create <name>"
  git checkout -- src/migrations/index.ts 2>/dev/null || true
  rm -f src/migrations/*drift_check*
  exit 1
fi
echo "✓ No Payload schema drift"
