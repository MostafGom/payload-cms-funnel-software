# ADR-0021: API style

- Status: Accepted
- Date: 2026-10-13

## Decision

- **Our APIs:** REST and JSON, versioned in the URL:
  - public: `/api/v1/*`;
  - admin: `/api/admin/v1/*`.
- **Contracts:** OpenAPI is generated from the Zod schemas. CI runs `oasdiff` to block breaking changes.
- **Payload REST** is mounted only on the admin host. GraphQL is disabled.
- **Errors** use RFC 9457 `application/problem+json`.
