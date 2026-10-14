# ADR-0024: Localization from day one

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-FUN-7, FR-CNS-1

## Decision

- **Enable Payload localization now**, starting with `en`. EU consent banners and funnels need several languages, and turning localization on later means a data migration.
- **Field scope:** only content fields are marked `localized: true`.
