# ADR-0005: Separate same-origin collector

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-TRK-2, NFR-1, NFR-2

## Decision

- A Hono service on Node handles `/_t/e` (events), `/_t/c` (consent) and `/_t/s.js` (the SDK).
- Caddy routes the `/_t/*` path on **every funnel host** to the collector, so it shares the page's origin and IP.
- The collector checks the request, enriches it, sets first-party HttpOnly cookies, dedupes, writes to the Valkey stream (`XADD`) and returns 204.
- It never touches Postgres or Payload.

## Consequences

- No CORS is needed, and cookies are set by the server. This matters for Safari's ITP, which caps cookies written by JavaScript.
- If Valkey is down, the collector returns 503 and the SDK's retry queue holds events. Failures are visible; events are never silently dropped.
- The collector scales separately from the web app.
