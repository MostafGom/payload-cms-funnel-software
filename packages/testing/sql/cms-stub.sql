-- Minimal subset of Payload's `cms` schema that workers read (ADR-0025 read model), for worker
-- integration tests on throwaway databases. apps/web/src/lib/cms-read.int.test.ts asserts that
-- every column here exists with the same type in the real, migrated schema.
CREATE SCHEMA IF NOT EXISTS cms;
CREATE TYPE cms.enum_contacts_lifecycle_stage AS ENUM ('subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist', 'other');
CREATE TYPE cms.enum_contacts_marketing_status AS ENUM ('none', 'unconfirmed', 'subscribed', 'unsubscribed');
CREATE TYPE cms.enum_contacts_status AS ENUM ('active', 'merged', 'erased');
CREATE TABLE cms.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name varchar, last_name varchar, email varchar UNIQUE, phone varchar, country varchar, city varchar,
  lifecycle_stage cms.enum_contacts_lifecycle_stage DEFAULT 'lead',
  custom_fields jsonb,
  marketing_status cms.enum_contacts_marketing_status DEFAULT 'none',
  status cms.enum_contacts_status DEFAULT 'active',
  email_hash varchar, phone_hash varchar,
  acquisition_utm_source varchar, acquisition_utm_medium varchar, acquisition_utm_campaign varchar,
  acquisition_click_id_type varchar,
  updated_at timestamp(3) with time zone NOT NULL DEFAULT now(),
  created_at timestamp(3) with time zone NOT NULL DEFAULT now()
);
CREATE TABLE cms.contacts_rels (
  id serial PRIMARY KEY, "order" integer, parent_id uuid NOT NULL REFERENCES cms.contacts(id) ON DELETE CASCADE,
  path varchar NOT NULL, tags_id uuid, lists_id uuid
);
CREATE TYPE cms.enum_form_submissions_status AS ENUM ('accepted', 'spam');
CREATE TABLE cms.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status cms.enum_form_submissions_status DEFAULT 'accepted',
  created_at timestamp(3) with time zone NOT NULL DEFAULT now()
);
CREATE TYPE cms.enum_dsar_requests_status AS ENUM ('received', 'verified', 'completed', 'rejected');
CREATE TABLE cms.dsar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status cms.enum_dsar_requests_status DEFAULT 'received',
  due_at timestamp(3) with time zone
);
