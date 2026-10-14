#!/usr/bin/env bash
# Restore drill (Phase 0 exit criterion, NFR-9): restores the latest base backup plus archived WAL
# into a throwaway container, checks the data, and reports RPO/RTO. Exits non-zero on failure.
#
#   SOURCE_URL=postgres://... ./infra/backup/restore-drill.sh      (env: WALG_* and AWS_* as in prod)
#
# SOURCE_URL is optional; with it, RPO is measured as the gap between the newest event in the source
# and in the restored copy.
set -euo pipefail
IMAGE="${PG_IMAGE:-fp-postgres:latest}"
NAME="fp-restore-drill-$$"
MAX_RPO_SECONDS="${MAX_RPO_SECONDS:-300}"
MAX_RTO_SECONDS="${MAX_RTO_SECONDS:-7200}"
NETWORK_ARGS=${DRILL_DOCKER_ARGS:-}
DB_USER="${DRILL_USER:-fp}"
DB_NAME="${DRILL_DB:-fp}"
started=$(date +%s)

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

env_args=()
for v in WALG_S3_PREFIX AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_ENDPOINT AWS_REGION AWS_S3_FORCE_PATH_STYLE WALG_LIBSODIUM_KEY WALG_COMPRESSION_METHOD; do
  [ -n "${!v:-}" ] && env_args+=(-e "$v=${!v}")
done

echo "== fetching latest base backup"
# shellcheck disable=SC2086
docker run -d --name "$NAME" $NETWORK_ARGS "${env_args[@]}" -e POSTGRES_PASSWORD=drill --entrypoint sleep "$IMAGE" infinity >/dev/null
docker exec -u postgres "$NAME" sh -c '. /usr/local/bin/walg-env.sh; mkdir -p "$PGDATA" && chmod 700 "$PGDATA" && wal-g backup-fetch "$PGDATA" LATEST'
docker exec -u postgres "$NAME" sh -c 'touch "$PGDATA/recovery.signal" && cat >> "$PGDATA/postgresql.auto.conf" <<CONF
restore_command = '"'"'. /usr/local/bin/walg-env.sh; wal-g wal-fetch %f %p'"'"'
archive_mode = off
recovery_target_action = promote
CONF'

echo "== replaying WAL"
docker exec -u postgres -d "$NAME" sh -c 'postgres -D "$PGDATA" > /tmp/pg.log 2>&1'
for _ in $(seq 1 600); do
  if docker exec -u postgres "$NAME" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT NOT pg_is_in_recovery()" 2>/dev/null | grep -q t; then break; fi
  sleep 1
done
docker exec -u postgres "$NAME" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT NOT pg_is_in_recovery()" | grep -q t || { docker exec "$NAME" tail -50 /tmp/pg.log; echo "recovery did not finish"; exit 1; }
rto=$(( $(date +%s) - started ))

q() { docker exec -u postgres "$NAME" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1"; }
events=$(q "SELECT count(*) FROM cdp.events")
contacts=$(q "SELECT count(*) FROM cms.contacts" 2>/dev/null || echo "n/a")
restored_max=$(q "SELECT coalesce(extract(epoch FROM max(received_at))::bigint, 0) FROM cdp.events")
migrations=$(q "SELECT count(*) FROM cdp._migrations")

rpo="n/a"
if [ -n "${SOURCE_URL:-}" ]; then
  source_max=$(docker run --rm $NETWORK_ARGS "$IMAGE" psql "$SOURCE_URL" -tAc "SELECT coalesce(extract(epoch FROM max(received_at))::bigint, 0) FROM cdp.events")
  rpo=$(( source_max - restored_max ))
fi

printf '{"ok":%s,"rto_seconds":%s,"rpo_seconds":"%s","events":%s,"contacts":"%s","cdp_migrations":%s}\n' \
  "$([ "$rto" -le "$MAX_RTO_SECONDS" ] && { [ "$rpo" = "n/a" ] || [ "$rpo" -le "$MAX_RPO_SECONDS" ]; } && echo true || echo false)" \
  "$rto" "$rpo" "$events" "$contacts" "$migrations"
[ "$rto" -le "$MAX_RTO_SECONDS" ] || { echo "RTO exceeded"; exit 1; }
[ "$rpo" = "n/a" ] || [ "$rpo" -le "$MAX_RPO_SECONDS" ] || { echo "RPO exceeded"; exit 1; }
echo "restore drill passed"
