# ADR-0001: Modular monolith in a pnpm + Turborepo monorepo

- Status: Accepted
- Date: 2026-10-13
- Requirements: NFR-2, NFR-13

## Context

We have one team, one brand and under 1M events per day. Only one path, event collection, has a strict latency SLO.

## Decision

- One pnpm + Turborepo monorepo that builds **three deployables**:
  - `apps/web`: Next.js + Payload. Serves the admin, funnel pages and the public/admin APIs.
  - `apps/collector`: Hono. Handles `/_t/*` only.
  - `apps/worker`: queue consumers. `WORKER_ROLES` picks which roles a process runs.
- Domain logic lives in `packages/modules/*`. Each module exposes a public API through `src/index.ts` only.
- dependency-cruiser (`.dependency-cruiser.cjs`) enforces the boundaries in CI:
  - no import cycles;
  - no deep imports into another module;
  - packages never import from apps;
  - destination adapters import only the SDK, event schemas and platform.

## Consequences

- One version of every dependency. Refactoring across the codebase is cheap.
- Code is split into services at module boundaries, not network boundaries. If a module later needs its own service, it can be extracted.
- Teams must respect public module APIs. CI fails when they do not.

## Alternatives considered

- Microservices: adds distributed transactions and contract churn with no benefit at our size.
- A single Next.js app: the collector would then pay Payload's boot time and memory, and would go down with every CMS deploy.
