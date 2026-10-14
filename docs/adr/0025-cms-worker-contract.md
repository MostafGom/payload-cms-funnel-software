# ADR-0025: How workers read CMS data (config snapshots and the contact read model)

- Status: Accepted
- Date: 2026-10-14
- Requirements: NFR-13, FR-DST-_, FR-EML-_, FR-CRM-6

## Context

Payload owns the `cms` schema and its table layout (arrays, blocks, locales, `_rels` tables) is an
implementation detail that changes when fields change. Workers (destinations, email, segments)
need two kinds of CMS data: low-volume **configuration** (destinations, forms, templates,
sequences, segments, experiments, settings) and high-volume **contact attributes**. Workers must
not depend on Payload's runtime (it lives in `apps/web`, ADR-0002) and must never write `cms`.

## Decision

1. **Config snapshots.** Every publish of a config document writes a validated JSON snapshot to
   `cdp.config_snapshots (kind, id, data)` from a Payload `afterChange` hook, in the same
   transaction as the edit (`apps/web/src/cms/hooks/snapshot.ts`). The schemas live in
   `@fp/contracts`; the CMS validates before writing and workers validate when reading
   (`apps/worker/src/lib/snapshots.ts`, 10 s cache). Drafts never reach workers. Secrets travel
   as AES-GCM ciphertext (ADR-0012).
2. **Contact read model.** Workers read only flat, stable columns of `cms.contacts` and
   `cms.contacts_rels` through `@fp/db` `repos.getContacts`. `apps/web/src/lib/cms-read.int.test.ts`
   fails CI if Payload changes those columns, and also checks that the worker test stub
   (`packages/testing/sql/cms-stub.sql`) matches the real schema.
3. **Writes go through the CMS.** Anything that changes CMS data (double opt-in, unsubscribe,
   merge, erasure) runs in `apps/web` via Payload. Workers write only `cdp`; derived state
   (segment membership, suppressions) lives in `cdp` and is shown in the admin by read-only UI.
4. **Atomic side effects.** CMS changes that need follow-up work (server events, email, sequence
   triggers, erasure purge) append to `cdp.outbox` through the same Payload transaction
   (`txExecute`), and the worker relay (ADR-0006) delivers them at least once.

## Consequences

- Renaming a field in a config collection only requires updating its snapshot builder; workers keep working.
- Adding a snapshot kind: schema in `@fp/contracts`, a builder hook, and an entry in the worker cache.
- Contact columns used by workers are a public contract: changing them is an expand/contract migration (ADR-0020).
- There is up to ~10 s of config propagation delay to workers (cache TTL).

## Alternatives considered

- Workers querying Payload tables for config: couples them to Payload internals; rejected.
- Running Payload inside the worker: drags Next.js and the whole CMS into a lean process; rejected.
- An internal HTTP API on `web` for workers: adds latency and a failure mode on the hot path; rejected.
