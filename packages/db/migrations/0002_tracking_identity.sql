-- Phase 1A: sessions, funnel journeys, identity graph, consent log, transactional outbox,
-- and CMS config snapshots (ADR-0006, ADR-0007, ADR-0011, ADR-0025).

-- Sessions (FR-TRK-4). Keyed by the SDK session id (30-min inactivity window client side).
-- Not partitioned: upserts need a stable key; retention deletes by last_seen_at (ADR-0004 amendment).
CREATE TABLE cdp.sessions (
  workspace_id   integer      NOT NULL DEFAULT 1,
  session_id     uuid         PRIMARY KEY,
  anonymous_id   uuid,
  contact_id     uuid,
  started_at     timestamptz  NOT NULL,
  last_seen_at   timestamptz  NOT NULL,
  event_count    integer      NOT NULL DEFAULT 0,
  pageviews      integer      NOT NULL DEFAULT 0,
  landing_url    text,
  landing_path   text,
  referrer       text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
  click_ids      jsonb,
  device_type    text,
  os             text,
  browser        text,
  geo_country    char(2),
  is_bot         boolean      NOT NULL DEFAULT false,
  converted      boolean      NOT NULL DEFAULT false
);
CREATE INDEX sessions_ws_started_idx ON cdp.sessions (workspace_id, started_at);
CREATE INDEX sessions_anon_idx       ON cdp.sessions (anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX sessions_contact_idx    ON cdp.sessions (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX sessions_last_seen_brin ON cdp.sessions USING brin (last_seen_at);

-- Funnel journeys read model (FR-TRK-4, FR-ANL-1). One row per visitor per funnel.
-- visitor_key = anonymous_id when consented, otherwise session_id.
CREATE TABLE cdp.funnel_journeys (
  workspace_id        integer      NOT NULL DEFAULT 1,
  funnel_id           text         NOT NULL,
  visitor_key         uuid         NOT NULL,
  anonymous_id        uuid,
  contact_id          uuid,
  variant_key         text,
  experiment_id       text,
  first_step_id       text,
  furthest_step_index integer      NOT NULL DEFAULT 0,
  steps               jsonb        NOT NULL DEFAULT '{}'::jsonb,
  utm_source          text,
  utm_campaign        text,
  started_at          timestamptz  NOT NULL,
  last_at             timestamptz  NOT NULL,
  converted_at        timestamptz,
  PRIMARY KEY (workspace_id, funnel_id, visitor_key)
);
CREATE INDEX funnel_journeys_started_idx ON cdp.funnel_journeys (workspace_id, funnel_id, started_at);
CREATE INDEX funnel_journeys_contact_idx ON cdp.funnel_journeys (contact_id) WHERE contact_id IS NOT NULL;

-- Identity graph (FR-TRK-5, ADR-0007): anonymous browser ids resolved to a contact.
CREATE TABLE cdp.identity_links (
  workspace_id integer      NOT NULL DEFAULT 1,
  anonymous_id uuid         NOT NULL,
  contact_id   uuid         NOT NULL,
  source       text         NOT NULL,
  linked_at    timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, anonymous_id)
);
CREATE INDEX identity_links_contact_idx ON cdp.identity_links (contact_id);

-- Platform identifiers per contact (FR-DST-5): fbp, fbc, ttp, scid, click ids, external ids.
CREATE TABLE cdp.contact_identifiers (
  workspace_id integer      NOT NULL DEFAULT 1,
  contact_id   uuid         NOT NULL,
  kind         text         NOT NULL,
  value        text         NOT NULL,
  first_seen   timestamptz  NOT NULL DEFAULT now(),
  last_seen    timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, kind, value)
);
CREATE INDEX contact_identifiers_lookup_idx ON cdp.contact_identifiers (workspace_id, kind, value);

-- Append-only consent log (FR-CNS-2). Proof of consent is kept 5 years (ADR-0012).
CREATE TABLE cdp.consent_records (
  id              uuid         PRIMARY KEY,
  workspace_id    integer      NOT NULL DEFAULT 1,
  recorded_at     timestamptz  NOT NULL,
  anonymous_id    uuid,
  contact_id      uuid,
  session_id      uuid,
  region          text         NOT NULL,
  regime          text         NOT NULL CHECK (regime IN ('opt_in', 'opt_out', 'notice')),
  policy_version  text,
  banner_version  text,
  analytics       boolean      NOT NULL,
  marketing       boolean      NOT NULL,
  gpc             boolean      NOT NULL DEFAULT false,
  source          text         NOT NULL,
  ip_trunc        inet,
  user_agent      text
);
CREATE INDEX consent_records_anon_idx    ON cdp.consent_records (anonymous_id, recorded_at) WHERE anonymous_id IS NOT NULL;
CREATE INDEX consent_records_contact_idx ON cdp.consent_records (contact_id, recorded_at) WHERE contact_id IS NOT NULL;

-- Append-only enforcement: rows may only be pseudonymised (ids nulled) by an erasure, or deleted
-- by the retention job, which sets `fp.consent_retention = on` for its transaction.
CREATE FUNCTION cdp.consent_records_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('fp.consent_retention', true) = 'on' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'consent_records is append-only';
  END IF;
  IF (NEW.id, NEW.recorded_at, NEW.region, NEW.regime, NEW.policy_version, NEW.banner_version,
      NEW.analytics, NEW.marketing, NEW.gpc, NEW.source)
     IS DISTINCT FROM
     (OLD.id, OLD.recorded_at, OLD.region, OLD.regime, OLD.policy_version, OLD.banner_version,
      OLD.analytics, OLD.marketing, OLD.gpc, OLD.source)
     OR (NEW.anonymous_id IS NOT NULL AND NEW.anonymous_id IS DISTINCT FROM OLD.anonymous_id)
     OR (NEW.contact_id IS NOT NULL AND NEW.contact_id IS DISTINCT FROM OLD.contact_id)
     OR (NEW.session_id IS NOT NULL AND NEW.session_id IS DISTINCT FROM OLD.session_id) THEN
    RAISE EXCEPTION 'consent_records is append-only (only pseudonymisation is allowed)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER consent_records_guard BEFORE UPDATE OR DELETE ON cdp.consent_records
  FOR EACH ROW EXECUTE FUNCTION cdp.consent_records_guard();

-- Transactional outbox (ADR-0006). Written in the same transaction as the business change,
-- relayed by the worker to BullMQ / the ingest stream, then marked published.
CREATE TABLE cdp.outbox (
  id            uuid         PRIMARY KEY,
  workspace_id  integer      NOT NULL DEFAULT 1,
  topic         text         NOT NULL,
  key           text,
  payload       jsonb        NOT NULL,
  traceparent   text,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  available_at  timestamptz  NOT NULL DEFAULT now(),
  attempts      integer      NOT NULL DEFAULT 0,
  last_error    text,
  published_at  timestamptz
);
CREATE INDEX outbox_pending_idx ON cdp.outbox (available_at) WHERE published_at IS NULL;

-- Published configuration from the CMS for workers (ADR-0025). The CMS writes a validated JSON
-- snapshot in the same transaction as the edit; workers never read Payload's table layout.
CREATE TABLE cdp.config_snapshots (
  kind        text         NOT NULL,
  id          text         NOT NULL,
  data        jsonb        NOT NULL,
  version     integer      NOT NULL DEFAULT 1,
  deleted     boolean      NOT NULL DEFAULT false,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
