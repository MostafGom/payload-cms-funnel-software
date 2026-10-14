#!/bin/sh
# Sidecar: a full base backup every BACKUP_INTERVAL_HOURS (default 24) and retention of the last
# BACKUP_RETAIN_FULL (default 7) full backups. WAL is archived continuously by Postgres itself
# (archive_command), which is what bounds data loss to archive_timeout (60 s) (NFR-9).
set -eu
. /usr/local/bin/walg-env.sh
interval=$(( ${BACKUP_INTERVAL_HOURS:-24} * 3600 ))
until pg_isready -q; do sleep 2; done
while true; do
  echo "$(date -u +%FT%TZ) backup-push starting"
  if wal-g backup-push "$PGDATA"; then
    wal-g delete retain FULL "${BACKUP_RETAIN_FULL:-7}" --confirm || true
    echo "$(date -u +%FT%TZ) backup-push ok"
  else
    echo "$(date -u +%FT%TZ) backup-push FAILED" >&2
  fi
  sleep "$interval"
done
