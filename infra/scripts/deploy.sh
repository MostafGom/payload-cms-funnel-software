#!/usr/bin/env bash
# Zero-downtime deploy of a tagged release to the app node (ADR-0019).
#   TAG=v1.2.3 ./infra/scripts/deploy.sh
# 1. pull images  2. run the migrator (expand-only migrations, ADR-0020)  3. rolling restart one
# replica at a time, waiting for health  4. on any failure, roll back to the previous tag.
set -euo pipefail
cd "$(dirname "$0")/../compose"
: "${TAG:?set TAG}"
PREV=$(cat /etc/fp/current-tag 2>/dev/null || echo "")
compose() { TAG=$1 docker compose -f prod-app.yml "${@:2}"; }

compose "$TAG" pull
echo "== migrations"
compose "$TAG" --profile migrate run --rm migrator

healthy() { # service
  for _ in $(seq 1 60); do
    local unhealthy
    unhealthy=$(compose "$TAG" ps --format '{{.Health}}' "$1" | grep -cv healthy || true)
    [ "$unhealthy" = 0 ] && return 0
    sleep 2
  done
  return 1
}

rollback() {
  echo "!! deploy failed; rolling back to ${PREV:-<none>}"
  [ -n "$PREV" ] && compose "$PREV" up -d --no-deps web collector worker-ingest worker-destinations worker-scheduler
  exit 1
}
trap rollback ERR

for svc in collector web worker-ingest worker-destinations worker-scheduler; do
  echo "== $svc"
  replicas=$(compose "$TAG" config --format json | node -e 'const c=JSON.parse(require("fs").readFileSync(0));console.log(c.services[process.argv[1]].deploy?.replicas ?? 1)' "$svc")
  # Scale up with the new image, wait, then drop the old containers.
  compose "$TAG" up -d --no-deps --no-recreate --scale "$svc=$((replicas * 2))" "$svc"
  healthy "$svc"
  compose "$TAG" up -d --no-deps --scale "$svc=$replicas" "$svc"
done
compose "$TAG" up -d caddy
echo "$TAG" > /etc/fp/current-tag
trap - ERR
echo "deployed $TAG"
