# ADR-0011: Consent management

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-CNS

## Decision

- **Purposes:** consent is per purpose (`analytics`, `marketing`). We build our own banner and do not adopt IAB TCF in v1.
- **Region rules** live in the `consent-config` global:
  - opt-in for EEA, UK and CH;
  - opt-out for listed US states, honoring GPC;
  - configurable defaults for every other region.
- **Before consent in opt-in regions:**
  - no identifier cookies and no pixels;
  - landing context is kept only in sessionStorage.
- **Enforcement happens on the server, not only in the banner.** The collector tags every event with a consent bitmask, and adapters check `requiredConsent` before sending. Skipped sends are recorded as `skipped_consent`.
- **Meta Limited Data Use** is applied to US-state users who opt out.
- **Consent log:** `cdp.consent_records` is append-only and records the policy and banner versions.
