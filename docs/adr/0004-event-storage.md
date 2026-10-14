# ADR-0004: Event storage

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-TRK, NFR-3, NFR-8

## Decision

- Store events in `cdp.events`, **range-partitioned by day on `received_at`**:
  - The primary key is `(event_id, received_at)`.
  - Partitions are created 14 days ahead by a scheduler job, plus a check at startup.
  - Retention works by dropping partitions.
- Ingestion bypasses Payload entirely.
- Reports read from read models (`funnel_journeys` and the `agg_*` rollups) through `AnalyticsReadPort`, never from raw events.
- **ClickHouse path:** when we pass 5M events per day sustained, add a `clickhouse-writer` consumer group on the same stream, then switch reads behind a feature flag.

## Consequences

- Inserts with `ON CONFLICT DO NOTHING` deduplicate within a partition. The Valkey `SET NX` check deduplicates across partitions within a 48 h window.
- About 25 GB per month at 1M events per day, which is fine on NVMe storage.

## Amendment (2026-10-14)

- `cdp.sessions` and `cdp.funnel_journeys` are **not** partitioned. Upserts need a stable key and
  the natural partition key (start time) is unknown when the first event of a session arrives.
  Retention deletes rows by `last_seen_at` / `last_at` (scheduler, ADR-0012); revisit with
  monthly partitions keyed by `started_at` if either table passes ~50M rows.
- `cdp.destination_deliveries` is partitioned daily on `created_at`, which is set to the event's
  `received_at`, making `(destination_id, event_id, created_at)` a true idempotency key.
- Insert and read-model updates (sessions, journeys, consent log, experiments, delivery fan-out)
  run in one transaction per batch and only for rows that were actually new, so stream
  redelivery can never double count (NFR-8).
