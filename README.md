# Funnel Platform

Funnels, forms, CRM and CDP (customer data platform) built on **Payload CMS v3 + Next.js 16**. The first release targets free sign-up funnels with first-party tracking plus server-side conversion events for Meta, TikTok and Snap.

| Read this                                                                                          | For                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`docs/requirements.md`](docs/requirements.md)                                                     | What we are building (requirement IDs referenced in tests and ADRs) |
| [`docs/architecture/overview.md`](docs/architecture/overview.md)                                   | C4 views, module map, hot paths                                     |
| [`docs/adr/`](docs/adr)                                                                            | Every architectural decision and why                                |
| [`docs/roadmap.md`](docs/roadmap.md)                                                               | Phases, exit criteria and current status                            |
| [`docs/runbooks/`](docs/runbooks)                                                                  | Deploy, restore, destinations, DSAR, email, secrets                 |
| [`docs/api/openapi.json`](docs/api/openapi.json), [`docs/event-catalog.md`](docs/event-catalog.md) | Public API and events (generated from the Zod contracts)            |

## Layout

```
apps/web               Next.js + Payload: admin (/admin + analytics, destination health, duplicates),
                       host-routed funnel pages, public API (/api/v1), Payload REST (/cms/api)
apps/collector         Hono tracking endpoint (/_t/*): validate, enrich, server-side consent, write to Valkey
apps/worker            WORKER_ROLES: ingest, relay (outbox), destinations, email, scheduler
apps/e2e               Playwright: funnel, consent matrix, A/B, erasure, admin smoke
packages/platform      Shared kernel: config, logger (PII redaction), crypto, redis, otel, SSRF guard
packages/contracts     Zod contracts between CMS and workers: snapshots, outbox, segment DSL, public API
packages/event-schemas Event envelope, versioned registry, stream contracts
packages/db            cdp schema: SQL migrations, partitions, typed tables, repositories
packages/modules/*     Pure domain logic: attribution, consent, forms, tracking, experiments, email, segments
packages/destinations-sdk + destinations/*   Adapter contract + Meta CAPI, TikTok, Snap, Standard Webhooks
packages/email-providers                     SMTP, Postmark, Resend, SES (SigV4)
packages/tracker-sdk   Browser SDK (4.3 KB gz): events, sessions, consent banner, pixels
tooling/               mock-destinations, k6 load tests, resilience test
infra/                 Docker images, compose (dev, prod-app, prod-data), Caddy, WAL-G backups, Grafana, Helm
```

## How a sign-up flows

1. The visitor lands on `go.brand.com/?utm_source=…&fbclid=…`. `proxy.ts` routes by host, assigns
   an A/B variant and sets the region hint; the page ships the SDK config.
2. The SDK sends events to `/_t/e`; the collector applies server-side consent, sets first-party
   cookies and appends to the Valkey stream; the ingest worker stores them and updates sessions
   and funnel journeys.
3. The form posts to `/api/v1/forms/:id/submissions`: validation, spam checks, contact dedupe,
   submission with full attribution and outbox rows commit in one transaction.
4. The browser pixel fires `Lead` with the same `event_id` the server event uses; the relay puts the
   server event on the stream; destinations (Meta, TikTok, Snap, webhook) receive it with hashed
   identifiers; email jobs send the double opt-in and start sequences.

## Getting started

Prerequisites: Node 24.15+, pnpm 12, Docker.

```sh
cp .env.example .env
pnpm install
pnpm infra:up            # Postgres 18, Valkey, Mailpit, S3 (SeaweedFS), Grafana LGTM, Caddy
pnpm db:migrate          # cdp SQL migrations + partitions, then Payload migrations (cms)
pnpm --filter @fp/web seed   # admin, demo funnel on go.localhost, form, emails, sequence, test destinations
pnpm --filter @fp/mock-destinations dev &   # fake Meta/TikTok/Snap/webhook receiver on :4010
pnpm dev                 # web :3000, collector :3100, worker (all roles)
```

Open **http://go.localhost:8080** for the demo funnel (served through Caddy, as in production).
The admin is at `/admin`; the seeded login is `admin@local.test` / `change-me-locally-123`.

| Service        | URL                                   |
| -------------- | ------------------------------------- |
| App via Caddy  | http://localhost:8080                 |
| Grafana        | http://localhost:3005                 |
| Mailpit        | http://localhost:8026                 |
| Mock platforms | http://localhost:4010/\_requests      |
| Postgres       | `postgres://fp:fp@localhost:54330/fp` |
| Valkey         | `redis://localhost:6390`              |

## Quality gates (all of them run in CI)

```sh
pnpm lint             # ESLint (type-aware), shared config
pnpm typecheck        # every package
pnpm test             # unit tests (no I/O)
pnpm test:int         # integration tests against local Postgres/Valkey (needs infra:up)
pnpm boundaries       # module boundary rules (ADR-0001)
pnpm format:check
pnpm --filter @fp/web migrate:check   # Payload schema drift (ADR-0020)
pnpm --filter @fp/e2e test            # Playwright against the running stack
```

Load, resilience, performance and backups:

```sh
docker run --rm --network host -v $PWD/tooling/k6:/k6 -e PROFILE=spike grafana/k6:1.3.0 run /k6/collector.js
WORKER_STOP=… WORKER_START=… ./tooling/resilience/run.sh   # kill worker, restart Valkey, stop Postgres
node --env-file=.env apps/worker/perf/segments.ts           # 1M-contact segment recompute
./infra/backup/restore-drill.sh                             # see docs/runbooks/restore.md
```

Tests that prove a requirement carry its ID in the test title, for example `FR-FRM-3: …`.

## Conventions

- **TypeScript runs natively.** The collector, worker and packages run under Node's type stripping: use explicit `.ts` import extensions and no enums or namespaces (`erasableSyntaxOnly`). The web app is compiled by Next and follows Next conventions.
- **Internal packages export source.** Import through each package's `exports` entry, never `src/`. `pnpm boundaries` enforces this.
- **Changing a Payload collection** (in `apps/web/src/cms`) needs a migration: `pnpm --filter @fp/web migrate:create <name>`.
- **Changing a `cdp` table** needs a new `packages/db/migrations/NNNN_name.sql`. Never edit one that has been applied. Update the drizzle definition too; the drift test checks that they match.
- **Adding a page block:** create `apps/web/src/cms/blocks/<Name>/{config.ts,Component.tsx}`, register it in `registry.ts` and `renderers.tsx`, then create a migration.
- **Adding an event type:** add `packages/event-schemas/src/events/<name>.v1.ts` and register it. Breaking changes need a new version plus an upcaster (ADR-0008).
- **Recording decisions:** a significant decision gets an ADR (copy `docs/adr/0000-template.md`).

## Container images

```sh
docker build -f infra/docker/Dockerfile.web -t fp-web .
docker build -f infra/docker/Dockerfile.node --build-arg APP=collector -t fp-collector .
docker build -f infra/docker/Dockerfile.node --build-arg APP=worker -t fp-worker .
docker build -f infra/docker/Dockerfile.web --target migrator -t fp-migrator .
docker build -f infra/docker/Dockerfile.postgres -t fp-postgres .
```

Production runs on two VPS with `infra/compose/prod-data.yml` and `prod-app.yml`; releases are
tags deployed by `.github/workflows/release.yml` → `infra/scripts/deploy.sh` (see `docs/runbooks/deploy.md`).
