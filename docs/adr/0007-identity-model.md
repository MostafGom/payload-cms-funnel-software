# ADR-0007: Identity model

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-TRK-5, FR-FRM-6, FR-CRM-7

## Decision

- The anonymous ID `_cm_aid` is a UUIDv7 set by the server, and lasts up to 400 days.
- **Deterministic links only.**
  - `identity_links(anonymous_id, contact_id)` are created by form submissions, signed email-click tokens and manual merges.
  - No probabilistic matching.
- **Contact dedupe:**
  - first by `email_normalized` (unique);
  - then by `phone_e164`;
  - on a conflict, flag `possibleDuplicateOf` and never auto-merge.
- **Identifiers kept for later server events:** `contact_identifiers` stores fbp, fbc, ttp, scid and click IDs. For example, an "email confirmed" CAPI event reuses the latest fbc.
