-- Phase 2/3: experiments, audit log, erasure tombstones, segments, duplicates, rollups
-- (ADR-0016, ADR-0012, ADR-0017).

-- Sticky experiment assignment (FR-FUN-5). visitor_key = assignment cookie value.
CREATE TABLE cdp.experiment_assignments (
  workspace_id  integer      NOT NULL DEFAULT 1,
  experiment_id text         NOT NULL,
  visitor_key   uuid         NOT NULL,
  variant_key   text         NOT NULL,
  assigned_at   timestamptz  NOT NULL DEFAULT now(),
  exposed_at    timestamptz,
  converted_at  timestamptz,
  PRIMARY KEY (workspace_id, experiment_id, visitor_key)
);
CREATE INDEX experiment_assignments_variant_idx ON cdp.experiment_assignments (experiment_id, variant_key);

-- Audit log of admin and CRM changes (Phase 2). Diff values for PII fields are masked.
CREATE TABLE cdp.audit_logs (
  id            uuid         PRIMARY KEY,
  workspace_id  integer      NOT NULL DEFAULT 1,
  at            timestamptz  NOT NULL DEFAULT now(),
  actor_type    text         NOT NULL,
  actor_id      text,
  action        text         NOT NULL,
  entity        text         NOT NULL,
  entity_id     text,
  changes       jsonb,
  trace_id      text
);
CREATE INDEX audit_logs_entity_idx ON cdp.audit_logs (entity, entity_id, at);
CREATE INDEX audit_logs_at_brin    ON cdp.audit_logs USING brin (at);

-- Erasure tombstones (FR-CNS-4): hashes only, so re-imports of an erased person can be blocked.
CREATE TABLE cdp.erasure_tombstones (
  id            uuid         PRIMARY KEY,
  workspace_id  integer      NOT NULL DEFAULT 1,
  contact_id    uuid         NOT NULL,
  email_hash    text,
  phone_hash    text,
  request_id    text,
  erased_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX erasure_tombstones_email_idx ON cdp.erasure_tombstones (workspace_id, email_hash);

-- Segment membership (FR-CRM-6) with enter/exit history in the outbox.
CREATE TABLE cdp.segment_memberships (
  workspace_id integer      NOT NULL DEFAULT 1,
  segment_id   text         NOT NULL,
  contact_id   uuid         NOT NULL,
  entered_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, segment_id, contact_id)
);
CREATE INDEX segment_memberships_contact_idx ON cdp.segment_memberships (contact_id);

-- Possible duplicates queue (FR-CRM-7). Never auto-merged.
CREATE TABLE cdp.duplicate_candidates (
  workspace_id  integer      NOT NULL DEFAULT 1,
  contact_a     uuid         NOT NULL,
  contact_b     uuid         NOT NULL,
  reason        text         NOT NULL,
  score         real         NOT NULL,
  status        text         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'merged', 'dismissed')),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  PRIMARY KEY (workspace_id, contact_a, contact_b),
  CHECK (contact_a < contact_b)
);

-- Daily rollups for dashboards (ADR-0017). Rebuilt idempotently per day by the scheduler.
CREATE TABLE cdp.agg_events_daily (
  workspace_id  integer  NOT NULL DEFAULT 1,
  day           date     NOT NULL,
  name          text     NOT NULL,
  funnel_id     text     NOT NULL DEFAULT '',
  step_id       text     NOT NULL DEFAULT '',
  variant_key   text     NOT NULL DEFAULT '',
  utm_source    text     NOT NULL DEFAULT '',
  utm_medium    text     NOT NULL DEFAULT '',
  utm_campaign  text     NOT NULL DEFAULT '',
  events        integer  NOT NULL,
  visitors      integer  NOT NULL,
  PRIMARY KEY (workspace_id, day, name, funnel_id, step_id, variant_key, utm_source, utm_medium, utm_campaign)
);

CREATE TABLE cdp.agg_delivery_hourly (
  workspace_id      integer      NOT NULL DEFAULT 1,
  hour              timestamptz  NOT NULL,
  destination_id    text         NOT NULL,
  status            text         NOT NULL,
  deliveries        integer      NOT NULL,
  p95_latency_ms    integer,
  PRIMARY KEY (workspace_id, hour, destination_id, status)
);
