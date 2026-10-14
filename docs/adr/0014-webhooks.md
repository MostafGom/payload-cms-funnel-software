# ADR-0014: Outbound webhooks

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-DST-9

## Decision

- **Signing:** the Standard Webhooks spec. Headers are `webhook-id`, `webhook-timestamp` and `webhook-signature: v1,<base64 HMAC-SHA256>`.
- **Body:** `{ id, type, api_version, occurred_at, data }`. `api_version` is a date. Versioned JSON Schemas live under `docs/api/webhooks/`.
- **SSRF protection:** when sending, the URL is resolved and rejected if it points at a private, link-local or metadata address. Redirects are not followed.
- **Failures:** retries follow ADR-0010. An endpoint is disabled automatically after 50 consecutive failures.
