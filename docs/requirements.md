# Requirements: Full-Funnel Platform

Status: **Baselined v1.0** (2026-10-13). Changes go through a PR that updates this file. Each requirement keeps its ID forever; retired ones are struck through, never renumbered.

## 1. Product scope

This platform is built on Payload CMS. It combines four things:

- a funnel and page builder;
- forms;
- a CRM (contacts);
- a CDP (customer data platform). The CDP records every visitor action and links anonymous visitors to known contacts.

**v1 target: free sign-up (lead capture) funnels.** Payments are out of scope until after v1.

### Fixed constraints

| ID  | Constraint                                                                               |
| --- | ---------------------------------------------------------------------------------------- |
| C-1 | Single company, single brand. The schema must not prevent multi-tenancy later (ADR-013). |
| C-2 | Fewer than 1M tracked events per day in year one.                                        |
| C-3 | Self-hosted with Docker on a VPS. Kubernetes later.                                      |
| C-4 | Funnels are served on the main domain and its subdomains, so cookies are first-party.    |
| C-5 | GDPR (EU/UK), CCPA/CPRA and other US state laws, and other regions all apply.            |

### Personas

| Persona       | Needs                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Visitor       | Fast pages, clear consent, a privacy-respecting experience                        |
| Marketer      | Builds funnels and forms, configures pixels and destinations, runs A/B tests      |
| Analyst       | Reads funnel and attribution reports. Personal data (PII) is masked for this role |
| Admin / Owner | Users, roles, settings, data-subject requests (DSAR)                              |
| Developer     | Adds blocks, fields and destinations without touching the core                    |

## 2. Functional requirements

Priority uses MoSCoW. **M** = must for v1, **S** = should, **C** = could. Phase is the roadmap phase that delivers it.

### FR-FUN: Funnels and pages

| ID       | Requirement                                                                                                                 | Pri | Phase |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| FR-FUN-1 | A funnel is an ordered set of steps (landing, form, thank-you, custom). Each step maps to a page.                           | M   | 1A    |
| FR-FUN-2 | Pages are built from a registry of blocks (hero, rich text, image, video, form, CTA, testimonials, FAQ, countdown, footer). | M   | 1A    |
| FR-FUN-3 | Drafts, version history, autosave, scheduled publish and live preview.                                                      | M   | 1A    |
| FR-FUN-4 | Pages are routed by host (`brand.com/*`, `go.brand.com/*`) using the `domains` collection.                                  | M   | 0/1A  |
| FR-FUN-5 | A/B split per step: weighted variants, sticky assignment, an exposure event, statistics, and promoting the winner.          | M   | 2     |
| FR-FUN-6 | Per-page SEO fields and per-page tracking overrides.                                                                        | S   | 1A    |
| FR-FUN-7 | Content is localized (Payload localization is on from day one).                                                             | S   | 0     |

### FR-FRM: Forms

| ID       | Requirement                                                                                                                                                             | Pri | Phase |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| FR-FRM-1 | Form builder with a field-type registry: text, email, phone, select, checkbox, consent, hidden, textarea, country.                                                      | M   | 1A    |
| FR-FRM-2 | Each field maps to a contact field or a custom field.                                                                                                                   | M   | 1A/3  |
| FR-FRM-3 | On submit, capture **all** URL params (utm\_\*, fbclid, gclid, ttclid, ScCid and any custom key), plus referrer, landing page, first touch, last touch, device and geo. | M   | 1A    |
| FR-FRM-4 | The server validates using a Zod schema generated from the published form version.                                                                                      | M   | 1A    |
| FR-FRM-5 | Spam protection: honeypot, minimum time to submit, Cloudflare Turnstile, rate limits, disposable-domain list.                                                           | M   | 1A    |
| FR-FRM-6 | Contacts are deduped on normalized email first, then on E.164 phone.                                                                                                    | M   | 1A    |
| FR-FRM-7 | Post-submit actions: go to next step or redirect, add tags and lists, set lifecycle stage, enroll in a sequence, double opt-in.                                         | M   | 1A–3  |
| FR-FRM-8 | Attribution still works when cookies are declined (values come from hidden fields and sessionStorage).                                                                  | M   | 1A    |

### FR-TRK: Tracking

| ID       | Requirement                                                                                                                                                                        | Pri | Phase |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----- |
| FR-TRK-1 | A first-party JS SDK (under 8 KB gzipped) tracks: page view (including SPA navigation), click autocapture, scroll depth, form started, abandoned and submitted, and custom events. | M   | 1A    |
| FR-TRK-2 | Events are sent in batches with `sendBeacon` to the same-origin `/_t/e`. A bounded retry queue holds events that fail to send.                                                     | M   | 1A    |
| FR-TRK-3 | The server enriches each event with geo, device/UA, a bot flag and a consent snapshot.                                                                                             | M   | 0/1A  |
| FR-TRK-4 | Sessions use a 30-minute inactivity window. A `funnel_journeys` read model tracks progress through funnels.                                                                        | M   | 1A    |
| FR-TRK-5 | Identity resolution: anonymous visitors are linked to contacts, and their past events are backfilled.                                                                              | M   | 1A    |
| FR-TRK-6 | Every event is consent-tagged. Events in opt-in regions are not stored with an identifier before consent.                                                                          | M   | 1A    |

### FR-DST: Destinations (pixels and server-to-server)

| ID       | Requirement                                                                                                        | Pri | Phase |
| -------- | ------------------------------------------------------------------------------------------------------------------ | --- | ----- |
| FR-DST-1 | Meta Pixel and Meta Conversions API (CAPI).                                                                        | M   | 1B    |
| FR-DST-2 | TikTok Pixel and TikTok Events API.                                                                                | M   | 2     |
| FR-DST-3 | Snap Pixel and Snap Conversions API.                                                                               | M   | 2     |
| FR-DST-4 | The browser pixel and the server event share one `event_id` (UUIDv7), so each platform counts the conversion once. | M   | 1B    |
| FR-DST-5 | Personal data is normalized and hashed with SHA-256. `_fbp`, `_fbc`, `_ttp`, `_scid` and click IDs are captured.   | M   | 1B    |
| FR-DST-6 | Delivery respects consent. Meta Limited Data Use is applied to opted-out US-state users.                           | M   | 1B    |
| FR-DST-7 | Per-destination rate limits, retries with backoff (stop after 72 h), a delivery log, manual and bulk replay.       | M   | 1B/2  |
| FR-DST-8 | Test event codes and a test mode per destination.                                                                  | M   | 1B    |
| FR-DST-9 | Outbound webhooks following the Standard Webhooks spec (signed, with retries).                                     | M   | 1B    |

### FR-CNS: Consent and privacy

| ID       | Requirement                                                                                                                                                      | Pri | Phase                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------ |
| FR-CNS-1 | A region-aware banner. Opt-in for EEA, UK and CH. Opt-out for US states, and the Global Privacy Control (GPC) signal is honored. Other regions are configurable. | M   | 1A/2                     |
| FR-CNS-2 | An append-only consent log that records policy and banner versions.                                                                                              | M   | 1A                       |
| FR-CNS-3 | Consent is enforced on the server for both storage and destinations.                                                                                             | M   | 1A                       |
| FR-CNS-4 | Data-subject requests: access, export, delete. Requests are verified and deadlines tracked (30 days GDPR, 45 days CCPA).                                         | M   | 1B (CLI) / 2 (automated) |
| FR-CNS-5 | Google Consent Mode v2 signals are mapped.                                                                                                                       | S   | 2                        |

### FR-EML: Email and webhooks

| ID       | Requirement                                                                    | Pri | Phase |
| -------- | ------------------------------------------------------------------------------ | --- | ----- |
| FR-EML-1 | Confirmation email and double opt-in.                                          | M   | 1B    |
| FR-EML-2 | Nurture sequences: trigger, delays, send windows, exit conditions.             | M   | 3     |
| FR-EML-3 | Provider adapters for SES, Postmark and Resend. Bounce and complaint webhooks. | M   | 1B/3  |
| FR-EML-4 | Suppression list and RFC 8058 one-click unsubscribe.                           | M   | 1B    |

### FR-CRM: CRM

| ID       | Requirement                                                                    | Pri | Phase |
| -------- | ------------------------------------------------------------------------------ | --- | ----- |
| FR-CRM-1 | Contacts with list and detail views.                                           | M   | 1A    |
| FR-CRM-2 | Tags and static lists.                                                         | M   | 1A/3  |
| FR-CRM-3 | Custom field definitions.                                                      | M   | 3     |
| FR-CRM-4 | Lifecycle stage and notes.                                                     | M   | 3     |
| FR-CRM-5 | A unified timeline per contact: events, submissions, emails, notes, consent.   | M   | 3     |
| FR-CRM-6 | Rule-based segments, including event conditions, with enter and exit events.   | M   | 3     |
| FR-CRM-7 | A queue of possible duplicates and manual merge. Never auto-merge on conflict. | S   | 3     |

### FR-ANL: Analytics

| ID       | Requirement                                                      | Pri | Phase |
| -------- | ---------------------------------------------------------------- | --- | ----- |
| FR-ANL-1 | Funnel step conversion, overall and per variant.                 | M   | 1B/2  |
| FR-ANL-2 | Breakdown by source, UTM, channel and click ID.                  | M   | 1B    |
| FR-ANL-3 | Destination health: success rate, latency, errors, dead letters. | M   | 2     |

## 3. Non-functional requirements

| ID     | Area                    | Target                                                                                                                |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | Availability            | Collector 99.9% per month. Funnel pages 99.9%. Admin 99.5%.                                                           |
| NFR-2  | Collector latency       | Server-side p95 under 30 ms and p99 under 100 ms. 300 events/s per vCPU. Designed to handle 1,000 events/s.           |
| NFR-3  | Ingest lag              | Time from collector accept to the Postgres row: p95 under 5 s, p99 under 30 s.                                        |
| NFR-4  | Destination latency     | Time from event to the destination's 2xx response: p95 under 60 s. Retries stop at 72 h.                              |
| NFR-5  | Form submit             | Server-side p95 under 300 ms, or under 500 ms including the Turnstile check.                                          |
| NFR-6  | Funnel page performance | At the 75th percentile on mobile: LCP under 2.0 s, INP under 200 ms, CLS under 0.1. Server response p95 under 200 ms. |
| NFR-7  | SDK                     | Core under 8 KB gzipped. Supports the last 2 versions of major browsers and iOS Safari 15+.                           |
| NFR-8  | Data integrity          | Less than 0.01% of accepted events lost. Zero duplicate events in storage.                                            |
| NFR-9  | Durability              | At most 5 minutes of data lost in a failure (RPO). Restore within 2 hours (RTO).                                      |
| NFR-10 | Security                | OWASP ASVS Level 2. No plaintext secrets. Personal data never appears in logs.                                        |
| NFR-11 | Privacy                 | See FR-CNS. The retention policy is in ADR-012.                                                                       |
| NFR-12 | Accessibility           | WCAG 2.2 AA for blocks and the consent banner.                                                                        |
| NFR-13 | Maintainability         | Module boundaries are enforced in CI. Each extension point has a contract test.                                       |
| NFR-14 | Observability           | Every request is traced from collector to destination. The SLOs above have alerts.                                    |

## 4. Traceability

- Each ADR lists the requirement IDs it addresses.
- Each test that proves a requirement puts the ID in its title, for example `it('FR-FRM-3: captures all url params', ...)`.
- Each phase exit criterion in `docs/roadmap.md` references requirement IDs.
