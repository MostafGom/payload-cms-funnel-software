# Restore and restore drill (NFR-9: RPO ≤ 5 min, RTO ≤ 2 h)

Backups: WAL is archived continuously by Postgres (`archive_timeout=60`), base backups nightly by
the `backup` sidecar (7 kept), encrypted with libsodium, stored in S3 (`WALG_S3_PREFIX`).

## Monthly drill (and after any backup change)

```sh
# on the data node (or any host with Docker and the backup credentials)
set -a; . /etc/fp/data.env; set +a
SOURCE_URL=postgres://fp:$POSTGRES_PASSWORD@$PRIVATE_IP:5432/fp ./infra/backup/restore-drill.sh
```

It restores LATEST + WAL into a throwaway container and prints
`{"ok":true,"rto_seconds":…,"rpo_seconds":…}`; it exits non-zero when RPO/RTO are exceeded.
Record the result in the ops log. Last local verification: RTO 10 s, RPO 0 s, 5,777/5,777 events.

## Real restore

1. Stop writers: `docker compose -f prod-app.yml stop worker-ingest worker-destinations worker-scheduler web`
   (keep the collector up: it buffers events in Valkey while Postgres is down).
2. On the data node, stop `postgres` and move its volume aside (never delete it).
3. Restore: `wal-g backup-fetch $PGDATA LATEST`, add `recovery.signal` and
   `restore_command = 'wal-g wal-fetch %f %p'` (for point-in-time recovery also set
   `recovery_target_time`), start Postgres and wait until `SELECT pg_is_in_recovery()` is false.
4. Start the app services. The ingest worker drains the buffered stream; nothing is lost if
   Valkey kept running.
5. Run the nightly reconciliation by hand (scheduler logs `reconciliation ok`).
