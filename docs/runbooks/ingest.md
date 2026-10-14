# Ingest lag, backlog and DLQ

- Alert "Ingest stream backlog growing": check worker-ingest is running and Postgres is healthy.
  Scale: `docker compose -f prod-app.yml up -d --scale worker-ingest=4` (consumer group shares load).
- Postgres down: the collector keeps accepting (Valkey buffers up to `INGEST_STREAM_MAXLEN`);
  entries stay pending and are reclaimed automatically once Postgres is back. Not a DLQ case.
- DLQ (`ingest:dlq`) holds entries that failed 5 times for data reasons. Inspect with
  `valkey-cli XRANGE ingest:dlq - + COUNT 10` (field `error`). After fixing the cause, re-add the
  payload (`e` field) to `ingest:events`; inserts are idempotent.
- Valkey must run with `noeviction` and AOF; a restart loses at most ~1 s of buffered events.
