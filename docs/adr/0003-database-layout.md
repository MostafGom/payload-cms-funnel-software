# ADR-0003: Postgres 18 with separate `cms` and `cdp` schemas

- Status: Accepted
- Date: 2026-10-13
- Requirements: C-2, NFR-8, NFR-9

## Decision

- Run one Postgres 18 cluster.
- Payload uses `schemaName: 'cms'` with UUID ids, and **Payload migrations** manage that schema.
- Raw and high-volume tables live in schema `cdp`, owned by `packages/db`:
  - **DDL:** forward-only plain SQL migrations (`packages/db/migrations/NNNN_*.sql`) applied by a small migrator with checksums and an advisory lock. drizzle-kit cannot express declarative partitioning, so it is not used.
  - **Queries:** drizzle-orm table definitions give type-safe reads and writes. An integration test fails if a definition and the migrated table diverge.
- `cdp` primary keys are UUIDv7, which are time-ordered and index friendly.
- Use separate DB roles: `web`, `worker` and `migrator`. The collector has no DB credentials.

## Consequences

- There are two migration mechanisms (Payload migrations and SQL files). Both run in the `migrator` container before rollout, and CI checks both for schema drift.
- Cross-schema foreign keys are not declared, because each schema has its own lifecycle. Consistency comes from IDs and reconciliation jobs.

## Amendments

- 2026-10-13 (Phase 0): replaced drizzle-kit with plain SQL migrations for `cdp`, because the core table is partitioned.
