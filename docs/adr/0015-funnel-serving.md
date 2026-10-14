# ADR-0015: Funnel serving and caching

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-FUN-4, NFR-6, C-4

## Decision

- **Routing by host:** Next's `proxy.ts` rewrites `host + path` to `/_sites/[host]/[[...slug]]`.
- **Caching:** pages are statically generated and refreshed on publish with `revalidateTag`.
- **TLS:** Caddy issues certificates on demand. It asks `/api/v1/domains/allowed` first, so only hostnames in the `domains` collection get one.
- **The marketing site** must sit behind the same proxy so cookies stay first-party and same-IP. This is a deployment requirement.
