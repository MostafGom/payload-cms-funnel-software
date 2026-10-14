# ADR-0018: Observability

- Status: Accepted
- Date: 2026-10-13
- Requirements: NFR-14

## Decision

- **Tracing:** OpenTelemetry in all three apps, sent through the OTel Collector to Grafana LGTM (Loki, Tempo, Mimir). `traceparent` is copied into stream entries and job data, so one trace covers collector → ingest → destination.
- **Logs:** pino, structured JSON, with PII redacted (ADR-0012).
- **Errors:** Sentry in web, admin and worker. Public funnel pages have no third-party error SDK.
- **Alerts:**
  - collector 5xx above 0.5% over 5 minutes;
  - ingest lag p95 above 30 s;
  - destination success below 95% over 15 minutes;
  - any `dead` delivery;
  - outbox age above 60 s;
  - partitions for upcoming days missing;
  - backup older than 26 h.
