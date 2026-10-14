# ADR-0020: Database migrations

- Status: Accepted
- Date: 2026-10-13

## Decision

- **Expand/contract only:**
  1. Add a nullable column.
  2. Backfill it with a job.
  3. Switch reads to it.
  4. Drop the old column in a later release.
- **No `push` outside local development.** Payload migrations live in `apps/web/src/migrations`. `cdp` SQL migrations live in `packages/db/migrations`; once applied, a file is never edited (its checksum is enforced).
- **CI drift checks:**
  - `pnpm --filter @fp/web migrate:check`: running `payload migrate:create --skip-empty` must produce nothing.
  - `packages/db` drift test: the drizzle definitions must match the migrated tables.
- **Partitions** are created by a runtime job, not by migrations.
