# ADR-0012: PII handling and retention

- Status: Accepted
- Date: 2026-10-13
- Requirements: NFR-10, NFR-11, FR-CNS-4

## Decision

- **Data classes:** `public`, `internal`, `pii`, `sensitive-secret`. Fields are annotated with their class.
- **Normalizing and hashing** (`@fp/platform/crypto`):
  - email: trimmed and lowercased;
  - phone: E.164;
  - names: lowercased, with whitespace and punctuation removed;
  - then SHA-256 hex.
- **IP addresses:** the full IP is kept only in transient stream and job payloads, for CAPI. Stored IPs are truncated to /24 (IPv4) or /48 (IPv6).
- **Secrets** (destination and provider credentials) are encrypted with AES-256-GCM using a key-id prefix, so keys can be rotated.
- **Logs** (pino) redact email, phone, IP, tokens and auth headers. A CI test scans captured logs for PII patterns.
- **Erasure** writes `erasure_tombstones` (hashes only) so erased people are not silently re-imported.

## Retention

| Data                  | Retention                                              |
| --------------------- | ------------------------------------------------------ |
| Raw events, sessions  | 13 months                                              |
| Rollups, journeys     | 25 months                                              |
| Delivery rows         | 90 days (the redacted request is purged after 14 days) |
| Contacts, submissions | Until erasure or 24 months of inactivity               |
| Consent records       | 5 years (pseudonymized on erasure)                     |
| Audit logs            | 2 years                                                |
| DSAR export files     | 7 days                                                 |
