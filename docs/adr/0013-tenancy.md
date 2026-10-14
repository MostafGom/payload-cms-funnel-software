# ADR-0013: Tenancy

- Status: Accepted
- Date: 2026-10-13
- Requirements: C-1

## Decision

- **Raw tables:** every `cdp.*` table gets `workspace_id int not null default 1`, as the leading column of composite indexes.
- **Payload collections:** no tenant field yet. `@payloadcms/plugin-multi-tenant` can add it later.
- **Request context:** every module service takes `ctx: RequestContext { workspaceId, actor, traceId }`. Each site key maps to a workspace.

## Consequences

- Adding a leading column to billions of partitioned rows later would be very expensive. Doing it now costs one int column.
- Admin screens stay simple until multi-tenancy is actually needed.
