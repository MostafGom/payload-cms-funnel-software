# ADR-0006: Messaging with Redis Streams, BullMQ and a transactional outbox

- Status: Accepted
- Date: 2026-10-13
- Requirements: NFR-3, NFR-4, NFR-8

## Decision

- **Valkey 8** runs with `maxmemory-policy noeviction` and AOF `everysec`.
- **Redis Streams** (`ingest:events`) carry the event firehose:
  - Consumer groups read in batches (`XREADGROUP COUNT 500 BLOCK 200`).
  - `XAUTOCLAIM` recovers entries from consumers that crashed.
  - An entry goes to the dead-letter stream `ingest:dlq` after 5 attempts.
- **BullMQ** runs jobs: one queue per destination with a rate limiter, plus webhooks, email and schedulers.
- **Transactional outbox:** a hidden Payload collection, written in the same transaction as the business change. A relay publishes it using `FOR UPDATE SKIP LOCKED`, `LISTEN/NOTIFY` and a 250 ms poll. Every flow that must not lose data goes through it: submission → CAPI, webhooks, emails.
- Payload's Jobs Queue is used only for Payload's own scheduled publishing.

## Alternatives considered

- pg-boss: 3–5 Postgres writes per job puts WAL load on the primary that also serves the CRM.
- Payload Jobs for everything: polls, runs through Payload hooks, and has no per-queue rate limiting.

## Amendment (2026-10-14)

- The outbox is `cdp.outbox`, written through Payload's own transaction (`txExecute`, ADR-0025).
- The relay claims rows with `FOR UPDATE SKIP LOCKED`, so any number of relays can run; failed
  messages back off exponentially (capped at 1 h). Handlers are idempotent.
- Database connection errors in the ingest consumer are **transient**: the batch stays pending in
  the stream and is reclaimed later. Only data errors count towards the DLQ (verified by
  `tooling/resilience/run.sh`).
- BullMQ jobs are enqueued after commit. If that step is lost (crash, Valkey restart), the
  scheduler's sweeper re-enqueues `pending`/stale `retrying` deliveries; job ids equal delivery ids,
  so this never duplicates a send.
