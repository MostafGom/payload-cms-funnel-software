# Roadmap

v1 is the end of Phase 3. A phase is finished only when every exit criterion is met. Each criterion names the requirement IDs it proves.

Legend: **[x]** verified in this repository (test or drill named), **[~]** built and verified locally, final check needs a real environment or third-party account, **[ ]** not done.

| Phase | Scope                                                                                 | Status                                                          |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0     | Foundations: monorepo, docs, infra, Payload skeleton, collector → stream → DB, CI     | **done locally**; staging VPS pending                           |
| 1A    | Builder (10 blocks), forms, tracker SDK, sessions, journeys, consent banner, contacts | **done**                                                        |
| 1B    | Meta pixel + CAPI, webhooks, email, dashboards v1, DSAR, retention, production setup  | **done locally**; production launch criteria need live accounts |
| 2     | TikTok, Snap, health + bulk replay, A/B tests, consent matrix, automated DSAR, audit  | **done**                                                        |
| 3     | Custom fields, notes, lifecycle, segments, timeline, sequences, providers, merge      | **done locally**; deliverability score needs a live domain      |
| 4     | Kubernetes (Helm + KEDA), ClickHouse path, GA4 / Google Ads, multi-tenancy, payments  | **started** (Helm chart); rest is backlog                       |

## Phase 0: Foundations

- [x] `pnpm install && pnpm infra:up && pnpm db:migrate && pnpm --filter @fp/web seed && pnpm dev` starts the stack.
- [x] Quality gates: format, lint, typecheck, unit, integration, boundaries, Payload drift (`.github/workflows/ci.yml`).
- [x] A published page renders through host routing (FR-FUN-4): `localhost` and `go.localhost` through Caddy.
- [x] An event reaches `cdp.events` with one trace collector → ingest (verified in Grafana Tempo: worker `ingest.batch` span links to the collector trace) (NFR-14).
- [x] Backup restore drill (NFR-9): `infra/backup/restore-drill.sh` against S3 (SeaweedFS): RTO 10 s, RPO 0 s, 5,777/5,777 events including post-backup WAL.
- [~] Same on a staging VPS with on-demand TLS: `infra/compose/prod-*.yml`, `Caddyfile.prod`, `infra/scripts/deploy.sh` are ready; needs the servers and DNS.

## Phase 1A: Builder, forms and tracking core

- [x] E2E (`apps/e2e/tests/funnel.spec.ts`): a visit with utm, fbclid, ttclid, ScCid, gclid and a custom param goes through the form to the thank-you step, and the submission stores exactly those params (FR-FRM-3).
- [x] No PII in logs: pino redaction (`logger.test.ts`), lint rule against logging bodies/contacts, delivery log stores match keys only (ADR-0012).
- [x] Load: k6 spike to 1,000 events/s through Caddy: p95 5.3 ms, p99 7.4 ms, 0 errors, 194,995/194,995 events stored (NFR-2/3). Steady 300/s profile: `PROFILE=steady` (15 min).
- [x] SDK budget: 4.3 KB gzipped (< 8 KB, NFR-7) enforced by `sdk.test.ts`.

## Phase 1B: Meta, webhooks, email, production

- [x] Pixel and CAPI share one event id; CAPI payload has hashed em/ph/fn, fbc, fbp, IP, UA (`funnel.spec.ts`, golden fixtures) (FR-DST-1/4/5).
- [x] Webhook signed per Standard Webhooks; reference test vector passes (FR-DST-9).
- [x] Double opt-in, one-click unsubscribe (RFC 8058), suppression, sequence start after confirmation (verified end to end with Mailpit).
- [x] Delivery log, retries (Retry-After aware, 72 h horizon → dead), manual + bulk replay, reconciliation job (FR-DST-7).
- [x] Dashboards v1 (admin: funnel analytics, sources, destination health) and Grafana SLO dashboard + alerts as code.
- [x] DSAR (export/erasure) via the admin, retention jobs (ADR-0012).
- [~] Live funnel 2 weeks; Meta Test Events shows deduplicated Leads with EMQ ≥ 6; n8n/Zapier verifies a webhook; SPF/DKIM/DMARC pass; ≥ 99 % delivery success. Needs production and your ad accounts. Use `runbooks/destinations.md`.

## Phase 2: TikTok, Snap, A/B testing, privacy

- [x] TikTok Events API and Snap CAPI adapters with golden fixtures, test codes / validate endpoint (FR-DST-2/3).
- [x] A/B split within ±2 % over 10,000 visitors (`experiments.test.ts`); sticky assignment and exposure tracking in the browser (`experiment.spec.ts`); significance, SRM and winner promotion (FR-FUN-5).
- [x] Erasure leaves zero PII (`privacy.spec.ts`) (FR-CNS-4).
- [x] Consent matrix: DE, FR, GB, BR (opt-in), US-CA (with and without GPC), US-TX (`consent.spec.ts`; server side `app.test.ts`, `consent.test.ts`) (FR-CNS-1/3, FR-TRK-6); Google Consent Mode v2 mapping (FR-CNS-5).
- [x] Audit log of CMS changes with PII masked (`cdp.audit_logs`).
- [x] Resilience: kill -9 the ingest worker mid-batch, restart Valkey, stop Postgres 60 s under load: no loss, no duplicates (`tooling/resilience/run.sh`).
- [~] TikTok/Snap Test Events show dedupe: needs your accounts.

## Phase 3: CRM depth and email sequences

- [x] 3-email sequence end to end on a time-travel clock (`pipeline.int.test.ts`) (FR-EML-2).
- [x] Bounces/complaints auto-suppress and exit sequences (`/api/v1/email/webhooks/:provider`, FR-EML-3/4).
- [x] Segment engine (rule DSL → parameterised SQL, enter/exit events, sequence triggers) (FR-CRM-6); 1M-contact recompute (`apps/worker/perf/segments.ts`): 1.1 s full, 0.5 s incremental (< 60 s).
- [x] Custom field definitions, notes, lifecycle stages, lists, timeline, duplicate queue with manual merge (FR-CRM-1..7).
- [~] Mail-tester ≥ 9: needs the sending domain and provider (`runbooks/email.md`).

## Phase 4: Scale and hardening (ongoing)

- [x] Helm chart with KEDA scaling on stream backlog (`infra/helm/funnel-platform`).
- [ ] Read replica + PgBouncer when CPU > 60 % (scale stage S2).
- [ ] ClickHouse writer as a second consumer group on `ingest:events`, reads behind `AnalyticsReadPort` (`apps/web/src/lib/analytics.ts`) when > 5M events/day.
- [ ] GA4 Measurement Protocol and Google Ads Enhanced Conversions adapters (new packages under `packages/destinations`).
- [ ] Multi-tenancy (workspace_id already on every cdp table; Payload multi-tenant plugin).
- [ ] Paid funnels (checkout, purchase events).
- [ ] External penetration test.
