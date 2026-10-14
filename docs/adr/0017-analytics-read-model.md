# ADR-0017: Analytics read model

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-ANL

## Decision

- **Funnel reports** come from `cdp.funnel_journeys`, with one row per visitor per funnel.
- **Rollups:** `agg_events_daily`, `agg_delivery_hourly` and `agg_experiment_daily` are refreshed every 5 minutes over a trailing 48 h window.
- **Access:** all reads go through the `AnalyticsReadPort` interface, so the storage behind it (Postgres, later ClickHouse) can be swapped behind a flag.
