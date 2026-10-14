-- Phase 1B/3: destination delivery log, email messages, suppressions and sequence enrollments
-- (ADR-0010, ADR-0022).

-- Delivery log (FR-DST-7), daily partitions on created_at; 90-day retention by partition drop.
-- Never stores raw PII: request_summary holds hashed identifiers and field presence only.
CREATE TABLE cdp.destination_deliveries (
  workspace_id      integer      NOT NULL DEFAULT 1,
  delivery_id       uuid         NOT NULL,
  created_at        timestamptz  NOT NULL,
  destination_id    text         NOT NULL,
  destination_type  text         NOT NULL,
  event_id          uuid         NOT NULL,
  event_name        text         NOT NULL,
  platform_event    text,
  contact_id        uuid,
  status            text         NOT NULL CHECK (status IN
                      ('pending', 'success', 'retrying', 'failed', 'dead', 'skipped_consent', 'skipped_config', 'skipped_filter')),
  attempts          integer      NOT NULL DEFAULT 0,
  test_mode         boolean      NOT NULL DEFAULT false,
  last_status_code  integer,
  last_error        text,
  latency_ms        integer,
  request_summary   jsonb,
  response_body     text,
  updated_at        timestamptz  NOT NULL,
  completed_at      timestamptz,
  PRIMARY KEY (delivery_id, created_at),
  UNIQUE (destination_id, event_id, created_at)
) PARTITION BY RANGE (created_at);
CREATE INDEX deliveries_dest_status_idx ON cdp.destination_deliveries (destination_id, status, created_at);
CREATE INDEX deliveries_event_idx       ON cdp.destination_deliveries (event_id);

-- Suppression list (FR-EML-4). Keyed by email hash so it survives contact erasure.
CREATE TABLE cdp.email_suppressions (
  workspace_id integer      NOT NULL DEFAULT 1,
  email_hash   text         NOT NULL,
  reason       text         NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual', 'erasure')),
  detail       text,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, email_hash)
);

-- Every email we send (FR-EML-1..3). to_hash only; the address is resolved from the contact at send time.
CREATE TABLE cdp.email_messages (
  id                   uuid         PRIMARY KEY,
  workspace_id         integer      NOT NULL DEFAULT 1,
  contact_id           uuid         NOT NULL,
  kind                 text         NOT NULL CHECK (kind IN ('transactional', 'double_opt_in', 'sequence', 'broadcast')),
  template_id          text,
  sequence_id          text,
  enrollment_id        uuid,
  step_index           integer,
  to_hash              text         NOT NULL,
  subject              text,
  provider             text,
  provider_message_id  text,
  status               text         NOT NULL CHECK (status IN
                         ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed')),
  error                text,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  sent_at              timestamptz,
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, step_index)
);
CREATE INDEX email_messages_contact_idx  ON cdp.email_messages (contact_id, created_at);
CREATE INDEX email_messages_provider_idx ON cdp.email_messages (provider, provider_message_id);

-- Sequence enrollments (FR-EML-2). One active enrollment per contact per sequence.
CREATE TABLE cdp.email_enrollments (
  id            uuid         PRIMARY KEY,
  workspace_id  integer      NOT NULL DEFAULT 1,
  contact_id    uuid         NOT NULL,
  sequence_id   text         NOT NULL,
  status        text         NOT NULL CHECK (status IN ('active', 'completed', 'exited', 'paused')),
  current_step  integer      NOT NULL DEFAULT 0,
  next_run_at   timestamptz,
  enrolled_at   timestamptz  NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  exit_reason   text,
  trigger       jsonb
);
CREATE UNIQUE INDEX email_enrollments_active_uq ON cdp.email_enrollments (contact_id, sequence_id) WHERE status IN ('active', 'paused');
CREATE INDEX email_enrollments_due_idx ON cdp.email_enrollments (next_run_at) WHERE status = 'active';
