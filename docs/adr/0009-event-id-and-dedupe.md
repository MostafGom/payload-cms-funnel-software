# ADR-0009: Event ID and deduplication

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-DST-4, NFR-8

## Decision

- **The client generates a UUIDv7 `event_id`** before sending, and the same ID is used everywhere:
  - the browser pixel (`eventID`);
  - the server event to CAPI, TikTok and Snap;
  - the stored row.
- **Form submissions:** the browser sends `eventId` along with the form. The outbox emits the server-side `form_submitted` with that same ID.
- **Dedupe layers:**
  - collector: Valkey `SET NX dedupe:{event_id} EX 172800`;
  - storage: `ON CONFLICT DO NOTHING`;
  - delivery: BullMQ `jobId = {destinationId}:{eventId}`.
