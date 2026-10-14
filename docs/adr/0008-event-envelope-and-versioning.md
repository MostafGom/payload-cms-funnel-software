# ADR-0008: Event envelope and schema registry

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-TRK-1, NFR-13

## Decision

- **Validation:** Zod schemas in `packages/event-schemas`. The envelope carries `event_id`, `name`, `schema_v`, timestamps, `session_id`, `page`, `context`, an optional `funnel` and `properties`.
- **Event names:** snake_case past tense, such as `page_viewed` and `form_submitted`. One file per version: `events/<name>.v<N>.ts`.
- **Versioning:**
  - Adding an optional field keeps the same version.
  - Removing, renaming or requiring a field means a new version plus an upcaster.
  - Raw rows keep the original `schema_v`.
- **SDK compatibility:** the collector accepts every SDK version from the last 180 days. Unknown event names are stored as `custom`.
- **Docs:** the event catalog in `docs/event-catalog` is generated from the registry.
