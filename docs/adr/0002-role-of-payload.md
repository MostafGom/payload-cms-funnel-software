# ADR-0002: Role of Payload CMS

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-FUN, FR-FRM, FR-CRM

## Decision

- **What Payload owns:** content (pages, funnels, forms), the CRM entities that admins edit, the admin UI, authentication and RBAC.
- **What Payload does not own:** high-volume data such as events and deliveries, and business logic.
- **Hooks stay thin.** A hook calls a module service or writes an outbox row (ADR-0006), and nothing else.
- **Configuration lives in `apps/web/src/cms/`.** Collections, globals, access rules and hooks live there. It sits inside the Next app because the Payload CLI, import map and migrations assume it (this replaces the planned separate `packages/cms`).
- **Domain code never imports `apps/web`.** Modules take what they need as arguments (ports) and use plain types.

## Consequences

- Payload upgrades affect only one package. This reduces the risk of upgrades breaking the platform.
- The admin can browse CRM data, while heavy reads (timeline, analytics) go through our own admin API backed by `cdp` tables.
