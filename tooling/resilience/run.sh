#!/usr/bin/env bash
# Resilience test (plan §11): under steady load, kill the ingest worker mid-batch, restart Valkey,
# and stop Postgres for OUTAGE_SECONDS. Afterwards every event the collector accepted (204) must be
# stored exactly once: no loss, no duplicates (NFR-8).
#   WORKER_RESTART="<cmd>" ./tooling/resilience/run.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
RUN="res-$(date +%s)"
OUTAGE_SECONDS=${OUTAGE_SECONDS:-60}
PG=${PG_CONTAINER:-funnel-platform-dev-postgres-1}
VK=${VALKEY_CONTAINER:-funnel-platform-dev-valkey-1}
: "${WORKER_STOP:?command that kills the worker (SIGKILL)}"
: "${WORKER_START:?command that starts the worker}"

echo "== load ($RUN)"
docker run --rm --user "$(id -u):$(id -g)" --network host -v "$ROOT/tooling/k6:/k6" -e RUN="$RUN" -e DURATION="${DURATION:-150s}" grafana/k6:1.3.0 \
  run --quiet --summary-export=/k6/$RUN.json /k6/tagged.js > /tmp/$RUN.k6.log 2>&1 &
K6=$!
sleep 20; echo "== kill -9 ingest worker mid-batch"; eval "$WORKER_STOP"; sleep 5; eval "$WORKER_START"
sleep 20; echo "== restart valkey"; docker restart "$VK" >/dev/null
sleep 20; echo "== stop postgres for ${OUTAGE_SECONDS}s"; docker stop "$PG" >/dev/null; sleep "$OUTAGE_SECONDS"; docker start "$PG" >/dev/null
wait $K6 || true
accepted=$(node -e 'const s=require(process.argv[1]);console.log(s.metrics.accepted_events?.count ?? 0)' "$ROOT/tooling/k6/$RUN.json")
rm -f "$ROOT/tooling/k6/$RUN.json"

echo "== waiting for ingest to drain"
q() { docker exec "$PG" psql -U fp fp -tAc "$1"; }
for _ in $(seq 1 120); do
  stored=$(q "SELECT count(*) FROM cdp.events WHERE sdk_v = '$RUN'" 2>/dev/null || echo 0)
  [ "$stored" -ge "$accepted" ] && break
  sleep 2
done
dupes=$(q "SELECT count(*) - count(DISTINCT event_id) FROM cdp.events WHERE sdk_v = '$RUN'")
dlq=$(docker exec "$VK" valkey-cli XLEN ingest:dlq)
echo "{\"accepted\":$accepted,\"stored\":$stored,\"duplicates\":$dupes,\"dlq\":$dlq}"
[ "$stored" -eq "$accepted" ] && [ "$dupes" -eq 0 ] && echo "resilience test passed" || { echo "resilience test FAILED"; exit 1; }
