-- ADR-0004: raw events, range-partitioned by day on received_at.
-- Partitions are created by ensureDailyPartitions(); there is intentionally no DEFAULT partition
-- (a default partition blocks creating new ranges once it holds rows).

CREATE TABLE cdp.events (
  workspace_id   integer      NOT NULL DEFAULT 1,
  event_id       uuid         NOT NULL,
  received_at    timestamptz  NOT NULL,
  occurred_at    timestamptz  NOT NULL,
  name           text         NOT NULL,
  schema_v       smallint     NOT NULL,
  source         text         NOT NULL CHECK (source IN ('browser', 'server')),
  anonymous_id   uuid,
  contact_id     uuid,
  session_id     uuid         NOT NULL,
  funnel_id      text,
  step_id        text,
  variant_key    text,
  page_url       text,
  page_path      text,
  referrer       text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
  click_ids      jsonb,
  properties     jsonb        NOT NULL DEFAULT '{}'::jsonb,
  context        jsonb,
  device_type    text,
  os             text,
  browser        text,
  geo_country    char(2),
  geo_region     text,
  geo_city       text,
  ip_trunc       inet,
  consent        smallint     NOT NULL,
  is_bot         boolean      NOT NULL DEFAULT false,
  sdk_v          text,
  PRIMARY KEY (event_id, received_at)
) PARTITION BY RANGE (received_at);

CREATE INDEX events_ws_anon_idx    ON cdp.events (workspace_id, anonymous_id, received_at);
CREATE INDEX events_contact_idx    ON cdp.events (contact_id, received_at) WHERE contact_id IS NOT NULL;
CREATE INDEX events_ws_name_idx    ON cdp.events (workspace_id, name, received_at);
CREATE INDEX events_session_idx    ON cdp.events (session_id, received_at);
CREATE INDEX events_received_brin  ON cdp.events USING brin (received_at);
