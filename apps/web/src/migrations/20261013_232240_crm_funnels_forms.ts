import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_pages_blocks_image_size" AS ENUM('content', 'full');
  CREATE TYPE "cms"."enum_pages_blocks_video_source" AS ENUM('youtube', 'vimeo', 'upload');
  CREATE TYPE "cms"."enum_pages_blocks_cta_buttons_style" AS ENUM('primary', 'secondary');
  CREATE TYPE "cms"."enum__pages_v_blocks_image_size" AS ENUM('content', 'full');
  CREATE TYPE "cms"."enum__pages_v_blocks_video_source" AS ENUM('youtube', 'vimeo', 'upload');
  CREATE TYPE "cms"."enum__pages_v_blocks_cta_buttons_style" AS ENUM('primary', 'secondary');
  CREATE TYPE "cms"."enum_funnels_steps_type" AS ENUM('landing', 'form', 'thank_you', 'custom');
  CREATE TYPE "cms"."enum_forms_blocks_field_text_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_text_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_textarea_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_textarea_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_email_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_email_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_phone_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_phone_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_select_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_select_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_checkbox_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_checkbox_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_consent_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_consent_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_consent_purpose" AS ENUM('email_marketing', 'sms_marketing', 'terms', 'privacy');
  CREATE TYPE "cms"."enum_forms_blocks_field_hidden_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_hidden_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_blocks_field_country_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum_forms_blocks_field_country_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum_forms_on_success_type" AS ENUM('next_step', 'redirect', 'message');
  CREATE TYPE "cms"."enum_forms_actions_lifecycle_stage" AS ENUM('subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist', 'other');
  CREATE TYPE "cms"."enum_forms_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_text_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_text_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_textarea_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_textarea_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_email_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_email_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_phone_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_phone_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_select_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_select_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_checkbox_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_checkbox_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_consent_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_consent_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_consent_purpose" AS ENUM('email_marketing', 'sms_marketing', 'terms', 'privacy');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_hidden_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_hidden_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_country_width" AS ENUM('full', 'half');
  CREATE TYPE "cms"."enum__forms_v_blocks_field_country_map_to" AS ENUM('email', 'phone', 'firstName', 'lastName', 'country', 'custom', 'none');
  CREATE TYPE "cms"."enum__forms_v_version_on_success_type" AS ENUM('next_step', 'redirect', 'message');
  CREATE TYPE "cms"."enum__forms_v_version_actions_lifecycle_stage" AS ENUM('subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist', 'other');
  CREATE TYPE "cms"."enum__forms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__forms_v_published_locale" AS ENUM('en');
  CREATE TYPE "cms"."enum_experiments_status" AS ENUM('draft', 'running', 'stopped', 'completed');
  CREATE TYPE "cms"."enum_contacts_lifecycle_stage" AS ENUM('subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist', 'other');
  CREATE TYPE "cms"."enum_contacts_marketing_status" AS ENUM('none', 'unconfirmed', 'subscribed', 'unsubscribed');
  CREATE TYPE "cms"."enum_contacts_status" AS ENUM('active', 'merged', 'erased');
  CREATE TYPE "cms"."enum_form_submissions_status" AS ENUM('accepted', 'spam');
  CREATE TYPE "cms"."enum_custom_field_definitions_type" AS ENUM('text', 'number', 'date', 'boolean', 'select');
  CREATE TYPE "cms"."enum_destinations_event_map_source" AS ENUM('page_viewed', 'element_clicked', 'scroll_depth_reached', 'form_started', 'form_abandoned', 'form_submitted', 'experiment_exposed', 'consent_updated', 'segment_entered', 'segment_exited', 'custom');
  CREATE TYPE "cms"."enum_destinations_type" AS ENUM('meta', 'tiktok', 'snap', 'webhook');
  CREATE TYPE "cms"."enum_email_sequences_steps_delay_unit" AS ENUM('minutes', 'hours', 'days');
  CREATE TYPE "cms"."enum_email_sequences_window_days" AS ENUM('1', '2', '3', '4', '5', '6', '7');
  CREATE TYPE "cms"."enum_email_sequences_trigger_type" AS ENUM('form_submitted', 'tag_added', 'list_joined', 'segment_entered', 'manual');
  CREATE TYPE "cms"."enum_dsar_requests_type" AS ENUM('export', 'delete');
  CREATE TYPE "cms"."enum_dsar_requests_regime" AS ENUM('gdpr', 'ccpa', 'other');
  CREATE TYPE "cms"."enum_dsar_requests_status" AS ENUM('received', 'verified', 'completed', 'rejected');
  CREATE TYPE "cms"."enum_consent_settings_overrides_regime" AS ENUM('opt_in', 'opt_out', 'notice');
  CREATE TYPE "cms"."enum_consent_settings_default_regime" AS ENUM('opt_in', 'opt_out', 'notice');
  CREATE TYPE "cms"."enum_email_settings_provider" AS ENUM('smtp', 'postmark', 'resend', 'ses');
  CREATE TABLE "cms"."pages_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"size" "cms"."enum_pages_blocks_image_size" DEFAULT 'content',
  	"priority" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "cms"."enum_pages_blocks_video_source" DEFAULT 'youtube',
  	"video_id" varchar,
  	"file_id" uuid,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"form_id" uuid,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_form_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"privacy_note" varchar DEFAULT 'We respect your privacy. Unsubscribe at any time.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"style" "cms"."enum_pages_blocks_cta_buttons_style" DEFAULT 'primary'
  );
  
  CREATE TABLE "cms"."pages_blocks_cta_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_cta_locales" (
  	"headline" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"avatar_id" uuid,
  	"rating" numeric
  );
  
  CREATE TABLE "cms"."pages_blocks_testimonials_items_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_faq_locales" (
  	"heading" varchar DEFAULT 'Frequently asked questions',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_countdown" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_countdown_locales" (
  	"label" varchar DEFAULT 'Offer ends in',
  	"expired_text" varchar DEFAULT 'This offer has ended.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_footer_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."pages_blocks_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_privacy_choices" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."pages_blocks_footer_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"size" "cms"."enum__pages_v_blocks_image_size" DEFAULT 'content',
  	"priority" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"source" "cms"."enum__pages_v_blocks_video_source" DEFAULT 'youtube',
  	"video_id" varchar,
  	"file_id" uuid,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"form_id" uuid,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_form_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"privacy_note" varchar DEFAULT 'We respect your privacy. Unsubscribe at any time.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_cta_buttons" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"href" varchar,
  	"style" "cms"."enum__pages_v_blocks_cta_buttons_style" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_cta_buttons_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_cta_locales" (
  	"headline" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"author" varchar,
  	"avatar_id" uuid,
  	"rating" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_testimonials_items_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_faq_locales" (
  	"heading" varchar DEFAULT 'Frequently asked questions',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_countdown" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_countdown_locales" (
  	"label" varchar DEFAULT 'Offer ends in',
  	"expired_text" varchar DEFAULT 'This offer has ended.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_footer_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"show_privacy_choices" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_pages_v_blocks_footer_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."funnels_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"step_id" varchar NOT NULL,
  	"type" "cms"."enum_funnels_steps_type" DEFAULT 'landing' NOT NULL,
  	"page_id" uuid NOT NULL,
  	"experiment_id" uuid
  );
  
  CREATE TABLE "cms"."funnels" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"domain_id" uuid NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_text_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_text_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_text_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_textarea_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_textarea_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"max_length" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_textarea_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_email_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_email_map_to" DEFAULT 'email',
  	"custom_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_email_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_phone" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_phone_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_phone_map_to" DEFAULT 'phone',
  	"custom_key" varchar,
  	"default_country" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_phone_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_select_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_select_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_select_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"multiple" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_select_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_checkbox_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_checkbox_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_checkbox_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_consent" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_consent_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_consent_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"purpose" "cms"."enum_forms_blocks_field_consent_purpose" DEFAULT 'email_marketing',
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_consent_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_hidden" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_hidden_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_hidden_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"default_value" varchar,
  	"from_param" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_hidden_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms_blocks_field_country" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum_forms_blocks_field_country_width" DEFAULT 'full',
  	"map_to" "cms"."enum_forms_blocks_field_country_map_to" DEFAULT 'country',
  	"custom_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."forms_blocks_field_country_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "cms"."forms" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"on_success_type" "cms"."enum_forms_on_success_type" DEFAULT 'next_step',
  	"on_success_redirect_url" varchar,
  	"actions_lifecycle_stage" "cms"."enum_forms_actions_lifecycle_stage",
  	"actions_double_opt_in" boolean DEFAULT false,
  	"actions_confirmation_template_id" uuid,
  	"spam_min_seconds" numeric DEFAULT 2,
  	"spam_turnstile" boolean DEFAULT false,
  	"spam_block_disposable" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "cms"."enum_forms_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "cms"."forms_locales" (
  	"submit_label" varchar DEFAULT 'Submit',
  	"on_success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."forms_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid,
  	"lists_id" uuid,
  	"email_sequences_id" uuid
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_text_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_text_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_text_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_textarea_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_textarea_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"max_length" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_textarea_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_email_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_email_map_to" DEFAULT 'email',
  	"custom_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_email_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_phone" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_phone_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_phone_map_to" DEFAULT 'phone',
  	"custom_key" varchar,
  	"default_country" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_phone_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_select_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_select_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_select_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"multiple" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_select_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_checkbox_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_checkbox_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_checkbox_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_consent" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_consent_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_consent_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"purpose" "cms"."enum__forms_v_blocks_field_consent_purpose" DEFAULT 'email_marketing',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_consent_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_hidden" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_hidden_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_hidden_map_to" DEFAULT 'none',
  	"custom_key" varchar,
  	"default_value" varchar,
  	"from_param" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_hidden_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_country" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"required" boolean DEFAULT false,
  	"width" "cms"."enum__forms_v_blocks_field_country_width" DEFAULT 'full',
  	"map_to" "cms"."enum__forms_v_blocks_field_country_map_to" DEFAULT 'country',
  	"custom_key" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "cms"."_forms_v_blocks_field_country_locales" (
  	"label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_name" varchar,
  	"version_on_success_type" "cms"."enum__forms_v_version_on_success_type" DEFAULT 'next_step',
  	"version_on_success_redirect_url" varchar,
  	"version_actions_lifecycle_stage" "cms"."enum__forms_v_version_actions_lifecycle_stage",
  	"version_actions_double_opt_in" boolean DEFAULT false,
  	"version_actions_confirmation_template_id" uuid,
  	"version_spam_min_seconds" numeric DEFAULT 2,
  	"version_spam_turnstile" boolean DEFAULT false,
  	"version_spam_block_disposable" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "cms"."enum__forms_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "cms"."enum__forms_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "cms"."_forms_v_locales" (
  	"version_submit_label" varchar DEFAULT 'Submit',
  	"version_on_success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."_forms_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid,
  	"lists_id" uuid,
  	"email_sequences_id" uuid
  );
  
  CREATE TABLE "cms"."experiments_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"weight" numeric DEFAULT 50 NOT NULL,
  	"page_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."experiments" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "cms"."enum_experiments_status" DEFAULT 'draft',
  	"goal_event" varchar DEFAULT 'form_submitted',
  	"funnel_id" uuid,
  	"step_id" varchar,
  	"winner" varchar,
  	"started_at" timestamp(3) with time zone,
  	"ended_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."contacts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"country" varchar,
  	"city" varchar,
  	"lifecycle_stage" "cms"."enum_contacts_lifecycle_stage" DEFAULT 'lead',
  	"custom_fields" jsonb,
  	"marketing_status" "cms"."enum_contacts_marketing_status" DEFAULT 'none',
  	"opt_in_confirmed_at" timestamp(3) with time zone,
  	"status" "cms"."enum_contacts_status" DEFAULT 'active',
  	"merged_into_id" uuid,
  	"email_hash" varchar,
  	"phone_hash" varchar,
  	"acquisition_utm_source" varchar,
  	"acquisition_utm_medium" varchar,
  	"acquisition_utm_campaign" varchar,
  	"acquisition_click_id_type" varchar,
  	"acquisition_landing_page" varchar,
  	"acquisition_referrer" varchar,
  	"acquisition_form_id" uuid,
  	"acquisition_funnel_id" uuid,
  	"first_touch" jsonb,
  	"last_touch" jsonb,
  	"consent" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."contacts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid,
  	"lists_id" uuid
  );
  
  CREATE TABLE "cms"."form_submissions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"form_id" uuid NOT NULL,
  	"form_version" varchar,
  	"contact_id" uuid,
  	"status" "cms"."enum_form_submissions_status" DEFAULT 'accepted',
  	"spam_reason" varchar,
  	"event_id" varchar NOT NULL,
  	"anonymous_id" varchar,
  	"session_id" varchar,
  	"data" jsonb,
  	"attribution" jsonb,
  	"utm_source" varchar,
  	"utm_campaign" varchar,
  	"funnel_id" uuid,
  	"step_id" varchar,
  	"variant_key" varchar,
  	"page_url" varchar,
  	"geo_country" varchar,
  	"consent" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."tags" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"color" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."lists" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."segments" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"rules" jsonb DEFAULT '{"type":"group","op":"and","conditions":[{"type":"attribute","field":"marketingStatus","operator":"eq","value":"subscribed"}]}'::jsonb NOT NULL,
  	"recompute_minutes" numeric DEFAULT 60,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."notes" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"contact_id" uuid NOT NULL,
  	"body" varchar NOT NULL,
  	"author_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."custom_field_definitions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "cms"."enum_custom_field_definitions_type" DEFAULT 'text' NOT NULL,
  	"pii" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."custom_field_definitions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."destinations_event_map" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "cms"."enum_destinations_event_map_source" NOT NULL,
  	"target" varchar NOT NULL,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "cms"."destinations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "cms"."enum_destinations_type" NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"test_mode" boolean DEFAULT true,
  	"pixel_id" varchar,
  	"test_event_code" varchar,
  	"browser_pixel" boolean DEFAULT true,
  	"access_token" varchar,
  	"endpoint_url" varchar,
  	"webhook_secret" varchar,
  	"rate_limit_per_second" numeric DEFAULT 50,
  	"limited_data_use" boolean DEFAULT true,
  	"include_bots" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."email_templates" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"preheader" varchar,
  	"body" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."email_sequences_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"delay_amount" numeric DEFAULT 0 NOT NULL,
  	"delay_unit" "cms"."enum_email_sequences_steps_delay_unit" DEFAULT 'days',
  	"template_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."email_sequences_window_days" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "cms"."enum_email_sequences_window_days",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "cms"."email_sequences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT false,
  	"trigger_type" "cms"."enum_email_sequences_trigger_type" DEFAULT 'form_submitted' NOT NULL,
  	"trigger_form_id" uuid,
  	"trigger_tag_id" uuid,
  	"trigger_list_id" uuid,
  	"trigger_segment_id" uuid,
  	"window_enabled" boolean DEFAULT false,
  	"window_start_hour" numeric DEFAULT 9,
  	"window_end_hour" numeric DEFAULT 17,
  	"window_timezone" varchar DEFAULT 'UTC',
  	"exit_segment_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."email_sequences_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cms"."email_sequences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" uuid
  );
  
  CREATE TABLE "cms"."dsar_requests" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"type" "cms"."enum_dsar_requests_type" NOT NULL,
  	"regime" "cms"."enum_dsar_requests_regime" DEFAULT 'gdpr',
  	"subject_email" varchar NOT NULL,
  	"contact_id" uuid,
  	"status" "cms"."enum_dsar_requests_status" DEFAULT 'received',
  	"verification_method" varchar,
  	"received_at" timestamp(3) with time zone,
  	"due_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"result" jsonb,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms"."tracking_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"site_key" varchar DEFAULT 'dev-site' NOT NULL,
  	"autocapture_clicks" boolean DEFAULT true,
  	"scroll_depth" boolean DEFAULT true,
  	"track_forms" boolean DEFAULT true,
  	"spa_pageviews" boolean DEFAULT true,
  	"session_timeout_minutes" numeric DEFAULT 30,
  	"debug" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."consent_settings_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar NOT NULL,
  	"regime" "cms"."enum_consent_settings_overrides_regime" NOT NULL
  );
  
  CREATE TABLE "cms"."consent_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"policy_version" varchar DEFAULT '1' NOT NULL,
  	"banner_version" varchar DEFAULT '1' NOT NULL,
  	"privacy_policy_url" varchar DEFAULT '/privacy',
  	"default_regime" "cms"."enum_consent_settings_default_regime" DEFAULT 'notice',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."consent_settings_locales" (
  	"title" varchar DEFAULT 'Your privacy',
  	"body" varchar DEFAULT 'We use cookies to measure our site and, with your permission, to show you relevant ads. You can change your choice at any time.',
  	"accept_label" varchar DEFAULT 'Accept all',
  	"reject_label" varchar DEFAULT 'Reject all',
  	"manage_label" varchar DEFAULT 'Choose',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "cms"."_locales" NOT NULL,
  	"_parent_id" uuid NOT NULL
  );
  
  CREATE TABLE "cms"."email_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"provider" "cms"."enum_email_settings_provider" DEFAULT 'smtp',
  	"from_name" varchar DEFAULT 'Funnel Platform',
  	"from_email" varchar DEFAULT 'hello@example.com',
  	"reply_to" varchar,
  	"postal_address" varchar,
  	"api_key" varchar,
  	"message_stream" varchar,
  	"ses_region" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cms"."feature_flags_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"rollout_percent" numeric DEFAULT 100,
  	"description" varchar
  );
  
  CREATE TABLE "cms"."feature_flags" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "cms"."pages" ADD COLUMN "seo_image_id" uuid;
  ALTER TABLE "cms"."pages" ADD COLUMN "tracking_disable_tracking" boolean DEFAULT false;
  ALTER TABLE "cms"."pages" ADD COLUMN "tracking_disable_pixels" boolean DEFAULT false;
  ALTER TABLE "cms"."pages" ADD COLUMN "tracking_disable_autocapture" boolean DEFAULT false;
  ALTER TABLE "cms"."pages" ADD COLUMN "tracking_page_event" varchar;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_seo_image_id" uuid;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_tracking_disable_tracking" boolean DEFAULT false;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_tracking_disable_pixels" boolean DEFAULT false;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_tracking_disable_autocapture" boolean DEFAULT false;
  ALTER TABLE "cms"."_pages_v" ADD COLUMN "version_tracking_page_event" varchar;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "funnels_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "forms_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "experiments_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "contacts_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "form_submissions_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "tags_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "lists_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "segments_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "notes_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "custom_field_definitions_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "destinations_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "email_templates_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "email_sequences_id" uuid;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "dsar_requests_id" uuid;
  ALTER TABLE "cms"."pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_image_locales" ADD CONSTRAINT "pages_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_video" ADD CONSTRAINT "pages_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_video_locales" ADD CONSTRAINT "pages_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_form" ADD CONSTRAINT "pages_blocks_form_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_form" ADD CONSTRAINT "pages_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_form_locales" ADD CONSTRAINT "pages_blocks_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_cta_buttons" ADD CONSTRAINT "pages_blocks_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_cta_buttons_locales" ADD CONSTRAINT "pages_blocks_cta_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_cta_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_cta_locales" ADD CONSTRAINT "pages_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_testimonials_items" ADD CONSTRAINT "pages_blocks_testimonials_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_testimonials_items" ADD CONSTRAINT "pages_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_testimonials_items_locales" ADD CONSTRAINT "pages_blocks_testimonials_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_testimonials_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_testimonials_locales" ADD CONSTRAINT "pages_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_countdown" ADD CONSTRAINT "pages_blocks_countdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_countdown_locales" ADD CONSTRAINT "pages_blocks_countdown_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_countdown"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_footer_links" ADD CONSTRAINT "pages_blocks_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_footer_links_locales" ADD CONSTRAINT "pages_blocks_footer_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_footer_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_footer" ADD CONSTRAINT "pages_blocks_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."pages_blocks_footer_locales" ADD CONSTRAINT "pages_blocks_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."pages_blocks_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_image_locales" ADD CONSTRAINT "_pages_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_video" ADD CONSTRAINT "_pages_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_video_locales" ADD CONSTRAINT "_pages_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_form" ADD CONSTRAINT "_pages_v_blocks_form_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_form" ADD CONSTRAINT "_pages_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_form_locales" ADD CONSTRAINT "_pages_v_blocks_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_cta_buttons" ADD CONSTRAINT "_pages_v_blocks_cta_buttons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_cta_buttons_locales" ADD CONSTRAINT "_pages_v_blocks_cta_buttons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_cta_buttons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_cta_locales" ADD CONSTRAINT "_pages_v_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_items" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_items" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_items_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_testimonials_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_countdown" ADD CONSTRAINT "_pages_v_blocks_countdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_countdown_locales" ADD CONSTRAINT "_pages_v_blocks_countdown_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_countdown"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_footer_links" ADD CONSTRAINT "_pages_v_blocks_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_footer_links_locales" ADD CONSTRAINT "_pages_v_blocks_footer_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_footer_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_footer" ADD CONSTRAINT "_pages_v_blocks_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v_blocks_footer_locales" ADD CONSTRAINT "_pages_v_blocks_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_pages_v_blocks_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."funnels_steps" ADD CONSTRAINT "funnels_steps_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "cms"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."funnels_steps" ADD CONSTRAINT "funnels_steps_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "cms"."experiments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."funnels_steps" ADD CONSTRAINT "funnels_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."funnels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."funnels" ADD CONSTRAINT "funnels_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "cms"."domains"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_text" ADD CONSTRAINT "forms_blocks_field_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_text_locales" ADD CONSTRAINT "forms_blocks_field_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_textarea" ADD CONSTRAINT "forms_blocks_field_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_textarea_locales" ADD CONSTRAINT "forms_blocks_field_textarea_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_textarea"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_email" ADD CONSTRAINT "forms_blocks_field_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_email_locales" ADD CONSTRAINT "forms_blocks_field_email_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_email"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_phone" ADD CONSTRAINT "forms_blocks_field_phone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_phone_locales" ADD CONSTRAINT "forms_blocks_field_phone_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_phone"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_select_options" ADD CONSTRAINT "forms_blocks_field_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_select_options_locales" ADD CONSTRAINT "forms_blocks_field_select_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_select_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_select" ADD CONSTRAINT "forms_blocks_field_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_select_locales" ADD CONSTRAINT "forms_blocks_field_select_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_checkbox" ADD CONSTRAINT "forms_blocks_field_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_checkbox_locales" ADD CONSTRAINT "forms_blocks_field_checkbox_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_checkbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_consent" ADD CONSTRAINT "forms_blocks_field_consent_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_consent_locales" ADD CONSTRAINT "forms_blocks_field_consent_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_consent"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_hidden" ADD CONSTRAINT "forms_blocks_field_hidden_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_hidden_locales" ADD CONSTRAINT "forms_blocks_field_hidden_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_hidden"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_country" ADD CONSTRAINT "forms_blocks_field_country_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_blocks_field_country_locales" ADD CONSTRAINT "forms_blocks_field_country_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms_blocks_field_country"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms" ADD CONSTRAINT "forms_actions_confirmation_template_id_email_templates_id_fk" FOREIGN KEY ("actions_confirmation_template_id") REFERENCES "cms"."email_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."forms_locales" ADD CONSTRAINT "forms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_rels" ADD CONSTRAINT "forms_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_rels" ADD CONSTRAINT "forms_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_rels" ADD CONSTRAINT "forms_rels_lists_fk" FOREIGN KEY ("lists_id") REFERENCES "cms"."lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."forms_rels" ADD CONSTRAINT "forms_rels_email_sequences_fk" FOREIGN KEY ("email_sequences_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_text" ADD CONSTRAINT "_forms_v_blocks_field_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_text_locales" ADD CONSTRAINT "_forms_v_blocks_field_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_textarea" ADD CONSTRAINT "_forms_v_blocks_field_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_textarea_locales" ADD CONSTRAINT "_forms_v_blocks_field_textarea_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_textarea"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_email" ADD CONSTRAINT "_forms_v_blocks_field_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_email_locales" ADD CONSTRAINT "_forms_v_blocks_field_email_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_email"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_phone" ADD CONSTRAINT "_forms_v_blocks_field_phone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_phone_locales" ADD CONSTRAINT "_forms_v_blocks_field_phone_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_phone"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_options" ADD CONSTRAINT "_forms_v_blocks_field_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_options_locales" ADD CONSTRAINT "_forms_v_blocks_field_select_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_select_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_select" ADD CONSTRAINT "_forms_v_blocks_field_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_locales" ADD CONSTRAINT "_forms_v_blocks_field_select_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_checkbox" ADD CONSTRAINT "_forms_v_blocks_field_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_checkbox_locales" ADD CONSTRAINT "_forms_v_blocks_field_checkbox_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_checkbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_consent" ADD CONSTRAINT "_forms_v_blocks_field_consent_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_consent_locales" ADD CONSTRAINT "_forms_v_blocks_field_consent_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_consent"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_hidden" ADD CONSTRAINT "_forms_v_blocks_field_hidden_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_hidden_locales" ADD CONSTRAINT "_forms_v_blocks_field_hidden_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_hidden"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_country" ADD CONSTRAINT "_forms_v_blocks_field_country_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_blocks_field_country_locales" ADD CONSTRAINT "_forms_v_blocks_field_country_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v_blocks_field_country"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v" ADD CONSTRAINT "_forms_v_parent_id_forms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v" ADD CONSTRAINT "_forms_v_version_actions_confirmation_template_id_email_templates_id_fk" FOREIGN KEY ("version_actions_confirmation_template_id") REFERENCES "cms"."email_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_locales" ADD CONSTRAINT "_forms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_rels" ADD CONSTRAINT "_forms_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_rels" ADD CONSTRAINT "_forms_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_rels" ADD CONSTRAINT "_forms_v_rels_lists_fk" FOREIGN KEY ("lists_id") REFERENCES "cms"."lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_forms_v_rels" ADD CONSTRAINT "_forms_v_rels_email_sequences_fk" FOREIGN KEY ("email_sequences_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."experiments_variants" ADD CONSTRAINT "experiments_variants_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "cms"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."experiments_variants" ADD CONSTRAINT "experiments_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."experiments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."experiments" ADD CONSTRAINT "experiments_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "cms"."funnels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contacts" ADD CONSTRAINT "contacts_merged_into_id_contacts_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contacts" ADD CONSTRAINT "contacts_acquisition_form_id_forms_id_fk" FOREIGN KEY ("acquisition_form_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contacts" ADD CONSTRAINT "contacts_acquisition_funnel_id_funnels_id_fk" FOREIGN KEY ("acquisition_funnel_id") REFERENCES "cms"."funnels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."contacts_rels" ADD CONSTRAINT "contacts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."contacts_rels" ADD CONSTRAINT "contacts_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."contacts_rels" ADD CONSTRAINT "contacts_rels_lists_fk" FOREIGN KEY ("lists_id") REFERENCES "cms"."lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."form_submissions" ADD CONSTRAINT "form_submissions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."form_submissions" ADD CONSTRAINT "form_submissions_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "cms"."funnels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "cms"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."custom_field_definitions_texts" ADD CONSTRAINT "custom_field_definitions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."destinations_event_map" ADD CONSTRAINT "destinations_event_map_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_steps" ADD CONSTRAINT "email_sequences_steps_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "cms"."email_templates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_steps" ADD CONSTRAINT "email_sequences_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_window_days" ADD CONSTRAINT "email_sequences_window_days_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences" ADD CONSTRAINT "email_sequences_trigger_form_id_forms_id_fk" FOREIGN KEY ("trigger_form_id") REFERENCES "cms"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences" ADD CONSTRAINT "email_sequences_trigger_tag_id_tags_id_fk" FOREIGN KEY ("trigger_tag_id") REFERENCES "cms"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences" ADD CONSTRAINT "email_sequences_trigger_list_id_lists_id_fk" FOREIGN KEY ("trigger_list_id") REFERENCES "cms"."lists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences" ADD CONSTRAINT "email_sequences_trigger_segment_id_segments_id_fk" FOREIGN KEY ("trigger_segment_id") REFERENCES "cms"."segments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences" ADD CONSTRAINT "email_sequences_exit_segment_id_segments_id_fk" FOREIGN KEY ("exit_segment_id") REFERENCES "cms"."segments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_texts" ADD CONSTRAINT "email_sequences_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_rels" ADD CONSTRAINT "email_sequences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."email_sequences_rels" ADD CONSTRAINT "email_sequences_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."dsar_requests" ADD CONSTRAINT "dsar_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "cms"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."consent_settings_overrides" ADD CONSTRAINT "consent_settings_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."consent_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."consent_settings_locales" ADD CONSTRAINT "consent_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."consent_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."feature_flags_flags" ADD CONSTRAINT "feature_flags_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_image_order_idx" ON "cms"."pages_blocks_image" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_parent_id_idx" ON "cms"."pages_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_path_idx" ON "cms"."pages_blocks_image" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_image_idx" ON "cms"."pages_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_image_locales_locale_parent_id_unique" ON "cms"."pages_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_video_order_idx" ON "cms"."pages_blocks_video" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_parent_id_idx" ON "cms"."pages_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_path_idx" ON "cms"."pages_blocks_video" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_file_idx" ON "cms"."pages_blocks_video" USING btree ("file_id");
  CREATE UNIQUE INDEX "pages_blocks_video_locales_locale_parent_id_unique" ON "cms"."pages_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_form_order_idx" ON "cms"."pages_blocks_form" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_parent_id_idx" ON "cms"."pages_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_path_idx" ON "cms"."pages_blocks_form" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_form_idx" ON "cms"."pages_blocks_form" USING btree ("form_id");
  CREATE UNIQUE INDEX "pages_blocks_form_locales_locale_parent_id_unique" ON "cms"."pages_blocks_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_buttons_order_idx" ON "cms"."pages_blocks_cta_buttons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_buttons_parent_id_idx" ON "cms"."pages_blocks_cta_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_cta_buttons_locales_locale_parent_id_unique" ON "cms"."pages_blocks_cta_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "cms"."pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "cms"."pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "cms"."pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cta_locales_locale_parent_id_unique" ON "cms"."pages_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_items_order_idx" ON "cms"."pages_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_items_parent_id_idx" ON "cms"."pages_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_items_avatar_idx" ON "cms"."pages_blocks_testimonials_items" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_items_locales_locale_parent_id_uni" ON "cms"."pages_blocks_testimonials_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "cms"."pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "cms"."pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "cms"."pages_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_locales_locale_parent_id_unique" ON "cms"."pages_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "cms"."pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "cms"."pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "cms"."pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "cms"."pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "cms"."pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "cms"."pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "cms"."pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_countdown_order_idx" ON "cms"."pages_blocks_countdown" USING btree ("_order");
  CREATE INDEX "pages_blocks_countdown_parent_id_idx" ON "cms"."pages_blocks_countdown" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_countdown_path_idx" ON "cms"."pages_blocks_countdown" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_countdown_locales_locale_parent_id_unique" ON "cms"."pages_blocks_countdown_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_footer_links_order_idx" ON "cms"."pages_blocks_footer_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_footer_links_parent_id_idx" ON "cms"."pages_blocks_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_footer_links_locales_locale_parent_id_unique" ON "cms"."pages_blocks_footer_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_footer_order_idx" ON "cms"."pages_blocks_footer" USING btree ("_order");
  CREATE INDEX "pages_blocks_footer_parent_id_idx" ON "cms"."pages_blocks_footer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_footer_path_idx" ON "cms"."pages_blocks_footer" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_footer_locales_locale_parent_id_unique" ON "cms"."pages_blocks_footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_image_order_idx" ON "cms"."_pages_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_parent_id_idx" ON "cms"."_pages_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_path_idx" ON "cms"."_pages_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_image_idx" ON "cms"."_pages_v_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_image_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_video_order_idx" ON "cms"."_pages_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_video_parent_id_idx" ON "cms"."_pages_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_video_path_idx" ON "cms"."_pages_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_video_file_idx" ON "cms"."_pages_v_blocks_video" USING btree ("file_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_video_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_form_order_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_parent_id_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_path_idx" ON "cms"."_pages_v_blocks_form" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_form_idx" ON "cms"."_pages_v_blocks_form" USING btree ("form_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_form_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_buttons_order_idx" ON "cms"."_pages_v_blocks_cta_buttons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_buttons_parent_id_idx" ON "cms"."_pages_v_blocks_cta_buttons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_buttons_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_cta_buttons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "cms"."_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "cms"."_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "cms"."_pages_v_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_items_order_idx" ON "cms"."_pages_v_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_items_parent_id_idx" ON "cms"."_pages_v_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_items_avatar_idx" ON "cms"."_pages_v_blocks_testimonials_items" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_items_locales_locale_parent_id_" ON "cms"."_pages_v_blocks_testimonials_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_order_idx" ON "cms"."_pages_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_parent_id_idx" ON "cms"."_pages_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_path_idx" ON "cms"."_pages_v_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "cms"."_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "cms"."_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "cms"."_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "cms"."_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "cms"."_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_countdown_order_idx" ON "cms"."_pages_v_blocks_countdown" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_countdown_parent_id_idx" ON "cms"."_pages_v_blocks_countdown" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_countdown_path_idx" ON "cms"."_pages_v_blocks_countdown" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_countdown_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_countdown_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_footer_links_order_idx" ON "cms"."_pages_v_blocks_footer_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_footer_links_parent_id_idx" ON "cms"."_pages_v_blocks_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_footer_links_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_footer_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_footer_order_idx" ON "cms"."_pages_v_blocks_footer" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_footer_parent_id_idx" ON "cms"."_pages_v_blocks_footer" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_footer_path_idx" ON "cms"."_pages_v_blocks_footer" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_footer_locales_locale_parent_id_unique" ON "cms"."_pages_v_blocks_footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "funnels_steps_order_idx" ON "cms"."funnels_steps" USING btree ("_order");
  CREATE INDEX "funnels_steps_parent_id_idx" ON "cms"."funnels_steps" USING btree ("_parent_id");
  CREATE INDEX "funnels_steps_page_idx" ON "cms"."funnels_steps" USING btree ("page_id");
  CREATE INDEX "funnels_steps_experiment_idx" ON "cms"."funnels_steps" USING btree ("experiment_id");
  CREATE INDEX "funnels_domain_idx" ON "cms"."funnels" USING btree ("domain_id");
  CREATE INDEX "funnels_updated_at_idx" ON "cms"."funnels" USING btree ("updated_at");
  CREATE INDEX "funnels_created_at_idx" ON "cms"."funnels" USING btree ("created_at");
  CREATE INDEX "forms_blocks_field_text_order_idx" ON "cms"."forms_blocks_field_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_text_parent_id_idx" ON "cms"."forms_blocks_field_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_text_path_idx" ON "cms"."forms_blocks_field_text" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_text_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_textarea_order_idx" ON "cms"."forms_blocks_field_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_textarea_parent_id_idx" ON "cms"."forms_blocks_field_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_textarea_path_idx" ON "cms"."forms_blocks_field_textarea" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_textarea_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_textarea_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_email_order_idx" ON "cms"."forms_blocks_field_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_email_parent_id_idx" ON "cms"."forms_blocks_field_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_email_path_idx" ON "cms"."forms_blocks_field_email" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_email_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_email_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_phone_order_idx" ON "cms"."forms_blocks_field_phone" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_phone_parent_id_idx" ON "cms"."forms_blocks_field_phone" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_phone_path_idx" ON "cms"."forms_blocks_field_phone" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_phone_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_phone_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_select_options_order_idx" ON "cms"."forms_blocks_field_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_select_options_parent_id_idx" ON "cms"."forms_blocks_field_select_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_blocks_field_select_options_locales_locale_parent_id_u" ON "cms"."forms_blocks_field_select_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_select_order_idx" ON "cms"."forms_blocks_field_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_select_parent_id_idx" ON "cms"."forms_blocks_field_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_select_path_idx" ON "cms"."forms_blocks_field_select" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_select_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_select_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_checkbox_order_idx" ON "cms"."forms_blocks_field_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_checkbox_parent_id_idx" ON "cms"."forms_blocks_field_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_checkbox_path_idx" ON "cms"."forms_blocks_field_checkbox" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_checkbox_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_checkbox_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_consent_order_idx" ON "cms"."forms_blocks_field_consent" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_consent_parent_id_idx" ON "cms"."forms_blocks_field_consent" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_consent_path_idx" ON "cms"."forms_blocks_field_consent" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_consent_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_consent_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_hidden_order_idx" ON "cms"."forms_blocks_field_hidden" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_hidden_parent_id_idx" ON "cms"."forms_blocks_field_hidden" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_hidden_path_idx" ON "cms"."forms_blocks_field_hidden" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_hidden_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_hidden_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_field_country_order_idx" ON "cms"."forms_blocks_field_country" USING btree ("_order");
  CREATE INDEX "forms_blocks_field_country_parent_id_idx" ON "cms"."forms_blocks_field_country" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_field_country_path_idx" ON "cms"."forms_blocks_field_country" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_field_country_locales_locale_parent_id_unique" ON "cms"."forms_blocks_field_country_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_actions_actions_confirmation_template_idx" ON "cms"."forms" USING btree ("actions_confirmation_template_id");
  CREATE INDEX "forms_updated_at_idx" ON "cms"."forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "cms"."forms" USING btree ("created_at");
  CREATE INDEX "forms__status_idx" ON "cms"."forms" USING btree ("_status");
  CREATE UNIQUE INDEX "forms_locales_locale_parent_id_unique" ON "cms"."forms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_rels_order_idx" ON "cms"."forms_rels" USING btree ("order");
  CREATE INDEX "forms_rels_parent_idx" ON "cms"."forms_rels" USING btree ("parent_id");
  CREATE INDEX "forms_rels_path_idx" ON "cms"."forms_rels" USING btree ("path");
  CREATE INDEX "forms_rels_tags_id_idx" ON "cms"."forms_rels" USING btree ("tags_id");
  CREATE INDEX "forms_rels_lists_id_idx" ON "cms"."forms_rels" USING btree ("lists_id");
  CREATE INDEX "forms_rels_email_sequences_id_idx" ON "cms"."forms_rels" USING btree ("email_sequences_id");
  CREATE INDEX "_forms_v_blocks_field_text_order_idx" ON "cms"."_forms_v_blocks_field_text" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_text_parent_id_idx" ON "cms"."_forms_v_blocks_field_text" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_text_path_idx" ON "cms"."_forms_v_blocks_field_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_text_locales_locale_parent_id_unique" ON "cms"."_forms_v_blocks_field_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_textarea_order_idx" ON "cms"."_forms_v_blocks_field_textarea" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_textarea_parent_id_idx" ON "cms"."_forms_v_blocks_field_textarea" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_textarea_path_idx" ON "cms"."_forms_v_blocks_field_textarea" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_textarea_locales_locale_parent_id_uniq" ON "cms"."_forms_v_blocks_field_textarea_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_email_order_idx" ON "cms"."_forms_v_blocks_field_email" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_email_parent_id_idx" ON "cms"."_forms_v_blocks_field_email" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_email_path_idx" ON "cms"."_forms_v_blocks_field_email" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_email_locales_locale_parent_id_unique" ON "cms"."_forms_v_blocks_field_email_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_phone_order_idx" ON "cms"."_forms_v_blocks_field_phone" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_phone_parent_id_idx" ON "cms"."_forms_v_blocks_field_phone" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_phone_path_idx" ON "cms"."_forms_v_blocks_field_phone" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_phone_locales_locale_parent_id_unique" ON "cms"."_forms_v_blocks_field_phone_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_select_options_order_idx" ON "cms"."_forms_v_blocks_field_select_options" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_select_options_parent_id_idx" ON "cms"."_forms_v_blocks_field_select_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_select_options_locales_locale_parent_i" ON "cms"."_forms_v_blocks_field_select_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_select_order_idx" ON "cms"."_forms_v_blocks_field_select" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_select_parent_id_idx" ON "cms"."_forms_v_blocks_field_select" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_select_path_idx" ON "cms"."_forms_v_blocks_field_select" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_select_locales_locale_parent_id_unique" ON "cms"."_forms_v_blocks_field_select_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_checkbox_order_idx" ON "cms"."_forms_v_blocks_field_checkbox" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_checkbox_parent_id_idx" ON "cms"."_forms_v_blocks_field_checkbox" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_checkbox_path_idx" ON "cms"."_forms_v_blocks_field_checkbox" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_checkbox_locales_locale_parent_id_uniq" ON "cms"."_forms_v_blocks_field_checkbox_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_consent_order_idx" ON "cms"."_forms_v_blocks_field_consent" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_consent_parent_id_idx" ON "cms"."_forms_v_blocks_field_consent" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_consent_path_idx" ON "cms"."_forms_v_blocks_field_consent" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_consent_locales_locale_parent_id_uniqu" ON "cms"."_forms_v_blocks_field_consent_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_hidden_order_idx" ON "cms"."_forms_v_blocks_field_hidden" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_hidden_parent_id_idx" ON "cms"."_forms_v_blocks_field_hidden" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_hidden_path_idx" ON "cms"."_forms_v_blocks_field_hidden" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_hidden_locales_locale_parent_id_unique" ON "cms"."_forms_v_blocks_field_hidden_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_field_country_order_idx" ON "cms"."_forms_v_blocks_field_country" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_field_country_parent_id_idx" ON "cms"."_forms_v_blocks_field_country" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_field_country_path_idx" ON "cms"."_forms_v_blocks_field_country" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_field_country_locales_locale_parent_id_uniqu" ON "cms"."_forms_v_blocks_field_country_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_parent_idx" ON "cms"."_forms_v" USING btree ("parent_id");
  CREATE INDEX "_forms_v_version_actions_version_actions_confirmation_te_idx" ON "cms"."_forms_v" USING btree ("version_actions_confirmation_template_id");
  CREATE INDEX "_forms_v_version_version_updated_at_idx" ON "cms"."_forms_v" USING btree ("version_updated_at");
  CREATE INDEX "_forms_v_version_version_created_at_idx" ON "cms"."_forms_v" USING btree ("version_created_at");
  CREATE INDEX "_forms_v_version_version__status_idx" ON "cms"."_forms_v" USING btree ("version__status");
  CREATE INDEX "_forms_v_created_at_idx" ON "cms"."_forms_v" USING btree ("created_at");
  CREATE INDEX "_forms_v_updated_at_idx" ON "cms"."_forms_v" USING btree ("updated_at");
  CREATE INDEX "_forms_v_snapshot_idx" ON "cms"."_forms_v" USING btree ("snapshot");
  CREATE INDEX "_forms_v_published_locale_idx" ON "cms"."_forms_v" USING btree ("published_locale");
  CREATE INDEX "_forms_v_latest_idx" ON "cms"."_forms_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_forms_v_locales_locale_parent_id_unique" ON "cms"."_forms_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_rels_order_idx" ON "cms"."_forms_v_rels" USING btree ("order");
  CREATE INDEX "_forms_v_rels_parent_idx" ON "cms"."_forms_v_rels" USING btree ("parent_id");
  CREATE INDEX "_forms_v_rels_path_idx" ON "cms"."_forms_v_rels" USING btree ("path");
  CREATE INDEX "_forms_v_rels_tags_id_idx" ON "cms"."_forms_v_rels" USING btree ("tags_id");
  CREATE INDEX "_forms_v_rels_lists_id_idx" ON "cms"."_forms_v_rels" USING btree ("lists_id");
  CREATE INDEX "_forms_v_rels_email_sequences_id_idx" ON "cms"."_forms_v_rels" USING btree ("email_sequences_id");
  CREATE INDEX "experiments_variants_order_idx" ON "cms"."experiments_variants" USING btree ("_order");
  CREATE INDEX "experiments_variants_parent_id_idx" ON "cms"."experiments_variants" USING btree ("_parent_id");
  CREATE INDEX "experiments_variants_page_idx" ON "cms"."experiments_variants" USING btree ("page_id");
  CREATE INDEX "experiments_funnel_idx" ON "cms"."experiments" USING btree ("funnel_id");
  CREATE INDEX "experiments_updated_at_idx" ON "cms"."experiments" USING btree ("updated_at");
  CREATE INDEX "experiments_created_at_idx" ON "cms"."experiments" USING btree ("created_at");
  CREATE UNIQUE INDEX "contacts_email_idx" ON "cms"."contacts" USING btree ("email");
  CREATE INDEX "contacts_phone_idx" ON "cms"."contacts" USING btree ("phone");
  CREATE INDEX "contacts_lifecycle_stage_idx" ON "cms"."contacts" USING btree ("lifecycle_stage");
  CREATE INDEX "contacts_marketing_status_idx" ON "cms"."contacts" USING btree ("marketing_status");
  CREATE INDEX "contacts_status_idx" ON "cms"."contacts" USING btree ("status");
  CREATE INDEX "contacts_merged_into_idx" ON "cms"."contacts" USING btree ("merged_into_id");
  CREATE INDEX "contacts_email_hash_idx" ON "cms"."contacts" USING btree ("email_hash");
  CREATE INDEX "contacts_phone_hash_idx" ON "cms"."contacts" USING btree ("phone_hash");
  CREATE INDEX "contacts_acquisition_acquisition_utm_source_idx" ON "cms"."contacts" USING btree ("acquisition_utm_source");
  CREATE INDEX "contacts_acquisition_acquisition_utm_campaign_idx" ON "cms"."contacts" USING btree ("acquisition_utm_campaign");
  CREATE INDEX "contacts_acquisition_acquisition_form_idx" ON "cms"."contacts" USING btree ("acquisition_form_id");
  CREATE INDEX "contacts_acquisition_acquisition_funnel_idx" ON "cms"."contacts" USING btree ("acquisition_funnel_id");
  CREATE INDEX "contacts_updated_at_idx" ON "cms"."contacts" USING btree ("updated_at");
  CREATE INDEX "contacts_created_at_idx" ON "cms"."contacts" USING btree ("created_at");
  CREATE INDEX "contacts_rels_order_idx" ON "cms"."contacts_rels" USING btree ("order");
  CREATE INDEX "contacts_rels_parent_idx" ON "cms"."contacts_rels" USING btree ("parent_id");
  CREATE INDEX "contacts_rels_path_idx" ON "cms"."contacts_rels" USING btree ("path");
  CREATE INDEX "contacts_rels_tags_id_idx" ON "cms"."contacts_rels" USING btree ("tags_id");
  CREATE INDEX "contacts_rels_lists_id_idx" ON "cms"."contacts_rels" USING btree ("lists_id");
  CREATE INDEX "form_submissions_form_idx" ON "cms"."form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_contact_idx" ON "cms"."form_submissions" USING btree ("contact_id");
  CREATE INDEX "form_submissions_status_idx" ON "cms"."form_submissions" USING btree ("status");
  CREATE UNIQUE INDEX "form_submissions_event_id_idx" ON "cms"."form_submissions" USING btree ("event_id");
  CREATE INDEX "form_submissions_anonymous_id_idx" ON "cms"."form_submissions" USING btree ("anonymous_id");
  CREATE INDEX "form_submissions_utm_source_idx" ON "cms"."form_submissions" USING btree ("utm_source");
  CREATE INDEX "form_submissions_funnel_idx" ON "cms"."form_submissions" USING btree ("funnel_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "cms"."form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "cms"."form_submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_name_idx" ON "cms"."tags" USING btree ("name");
  CREATE INDEX "tags_updated_at_idx" ON "cms"."tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "cms"."tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "lists_name_idx" ON "cms"."lists" USING btree ("name");
  CREATE INDEX "lists_updated_at_idx" ON "cms"."lists" USING btree ("updated_at");
  CREATE INDEX "lists_created_at_idx" ON "cms"."lists" USING btree ("created_at");
  CREATE INDEX "segments_updated_at_idx" ON "cms"."segments" USING btree ("updated_at");
  CREATE INDEX "segments_created_at_idx" ON "cms"."segments" USING btree ("created_at");
  CREATE INDEX "notes_contact_idx" ON "cms"."notes" USING btree ("contact_id");
  CREATE INDEX "notes_author_idx" ON "cms"."notes" USING btree ("author_id");
  CREATE INDEX "notes_updated_at_idx" ON "cms"."notes" USING btree ("updated_at");
  CREATE INDEX "notes_created_at_idx" ON "cms"."notes" USING btree ("created_at");
  CREATE UNIQUE INDEX "custom_field_definitions_key_idx" ON "cms"."custom_field_definitions" USING btree ("key");
  CREATE INDEX "custom_field_definitions_updated_at_idx" ON "cms"."custom_field_definitions" USING btree ("updated_at");
  CREATE INDEX "custom_field_definitions_created_at_idx" ON "cms"."custom_field_definitions" USING btree ("created_at");
  CREATE INDEX "custom_field_definitions_texts_order_parent" ON "cms"."custom_field_definitions_texts" USING btree ("order","parent_id");
  CREATE INDEX "destinations_event_map_order_idx" ON "cms"."destinations_event_map" USING btree ("_order");
  CREATE INDEX "destinations_event_map_parent_id_idx" ON "cms"."destinations_event_map" USING btree ("_parent_id");
  CREATE INDEX "destinations_updated_at_idx" ON "cms"."destinations" USING btree ("updated_at");
  CREATE INDEX "destinations_created_at_idx" ON "cms"."destinations" USING btree ("created_at");
  CREATE INDEX "email_templates_updated_at_idx" ON "cms"."email_templates" USING btree ("updated_at");
  CREATE INDEX "email_templates_created_at_idx" ON "cms"."email_templates" USING btree ("created_at");
  CREATE INDEX "email_sequences_steps_order_idx" ON "cms"."email_sequences_steps" USING btree ("_order");
  CREATE INDEX "email_sequences_steps_parent_id_idx" ON "cms"."email_sequences_steps" USING btree ("_parent_id");
  CREATE INDEX "email_sequences_steps_template_idx" ON "cms"."email_sequences_steps" USING btree ("template_id");
  CREATE INDEX "email_sequences_window_days_order_idx" ON "cms"."email_sequences_window_days" USING btree ("order");
  CREATE INDEX "email_sequences_window_days_parent_idx" ON "cms"."email_sequences_window_days" USING btree ("parent_id");
  CREATE INDEX "email_sequences_trigger_trigger_form_idx" ON "cms"."email_sequences" USING btree ("trigger_form_id");
  CREATE INDEX "email_sequences_trigger_trigger_tag_idx" ON "cms"."email_sequences" USING btree ("trigger_tag_id");
  CREATE INDEX "email_sequences_trigger_trigger_list_idx" ON "cms"."email_sequences" USING btree ("trigger_list_id");
  CREATE INDEX "email_sequences_trigger_trigger_segment_idx" ON "cms"."email_sequences" USING btree ("trigger_segment_id");
  CREATE INDEX "email_sequences_exit_exit_segment_idx" ON "cms"."email_sequences" USING btree ("exit_segment_id");
  CREATE INDEX "email_sequences_updated_at_idx" ON "cms"."email_sequences" USING btree ("updated_at");
  CREATE INDEX "email_sequences_created_at_idx" ON "cms"."email_sequences" USING btree ("created_at");
  CREATE INDEX "email_sequences_texts_order_parent" ON "cms"."email_sequences_texts" USING btree ("order","parent_id");
  CREATE INDEX "email_sequences_rels_order_idx" ON "cms"."email_sequences_rels" USING btree ("order");
  CREATE INDEX "email_sequences_rels_parent_idx" ON "cms"."email_sequences_rels" USING btree ("parent_id");
  CREATE INDEX "email_sequences_rels_path_idx" ON "cms"."email_sequences_rels" USING btree ("path");
  CREATE INDEX "email_sequences_rels_tags_id_idx" ON "cms"."email_sequences_rels" USING btree ("tags_id");
  CREATE INDEX "dsar_requests_contact_idx" ON "cms"."dsar_requests" USING btree ("contact_id");
  CREATE INDEX "dsar_requests_status_idx" ON "cms"."dsar_requests" USING btree ("status");
  CREATE INDEX "dsar_requests_updated_at_idx" ON "cms"."dsar_requests" USING btree ("updated_at");
  CREATE INDEX "dsar_requests_created_at_idx" ON "cms"."dsar_requests" USING btree ("created_at");
  CREATE INDEX "consent_settings_overrides_order_idx" ON "cms"."consent_settings_overrides" USING btree ("_order");
  CREATE INDEX "consent_settings_overrides_parent_id_idx" ON "cms"."consent_settings_overrides" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "consent_settings_locales_locale_parent_id_unique" ON "cms"."consent_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "feature_flags_flags_order_idx" ON "cms"."feature_flags_flags" USING btree ("_order");
  CREATE INDEX "feature_flags_flags_parent_id_idx" ON "cms"."feature_flags_flags" USING btree ("_parent_id");
  ALTER TABLE "cms"."pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_pages_v" ADD CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_funnels_fk" FOREIGN KEY ("funnels_id") REFERENCES "cms"."funnels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "cms"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_experiments_fk" FOREIGN KEY ("experiments_id") REFERENCES "cms"."experiments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "cms"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "cms"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "cms"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lists_fk" FOREIGN KEY ("lists_id") REFERENCES "cms"."lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_segments_fk" FOREIGN KEY ("segments_id") REFERENCES "cms"."segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notes_fk" FOREIGN KEY ("notes_id") REFERENCES "cms"."notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_custom_field_definitions_fk" FOREIGN KEY ("custom_field_definitions_id") REFERENCES "cms"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "cms"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_templates_fk" FOREIGN KEY ("email_templates_id") REFERENCES "cms"."email_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_sequences_fk" FOREIGN KEY ("email_sequences_id") REFERENCES "cms"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dsar_requests_fk" FOREIGN KEY ("dsar_requests_id") REFERENCES "cms"."dsar_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_seo_seo_image_idx" ON "cms"."pages" USING btree ("seo_image_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_image_idx" ON "cms"."_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "payload_locked_documents_rels_funnels_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("funnels_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_experiments_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("experiments_id");
  CREATE INDEX "payload_locked_documents_rels_contacts_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("contacts_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_lists_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("lists_id");
  CREATE INDEX "payload_locked_documents_rels_segments_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("segments_id");
  CREATE INDEX "payload_locked_documents_rels_notes_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("notes_id");
  CREATE INDEX "payload_locked_documents_rels_custom_field_definitions_i_idx" ON "cms"."payload_locked_documents_rels" USING btree ("custom_field_definitions_id");
  CREATE INDEX "payload_locked_documents_rels_destinations_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("destinations_id");
  CREATE INDEX "payload_locked_documents_rels_email_templates_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("email_templates_id");
  CREATE INDEX "payload_locked_documents_rels_email_sequences_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("email_sequences_id");
  CREATE INDEX "payload_locked_documents_rels_dsar_requests_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("dsar_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."pages_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_cta_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_cta_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_testimonials_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_testimonials_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_countdown" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_countdown_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_footer_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_footer_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."pages_blocks_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_cta_buttons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_cta_buttons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_cta_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_countdown" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_countdown_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_footer_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_footer_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_pages_v_blocks_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."funnels_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."funnels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_textarea" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_textarea_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_email_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_phone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_phone_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_select_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_select_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_select" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_select_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_checkbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_checkbox_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_consent" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_consent_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_hidden" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_hidden_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_country" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_blocks_field_country_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."forms_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_textarea" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_textarea_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_email_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_phone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_phone_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_select" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_select_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_checkbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_checkbox_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_consent" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_consent_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_hidden" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_hidden_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_country" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_blocks_field_country_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_forms_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."experiments_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."experiments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."contacts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."lists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."custom_field_definitions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."custom_field_definitions_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."destinations_event_map" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."destinations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_sequences_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_sequences_window_days" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_sequences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_sequences_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_sequences_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."dsar_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."tracking_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."consent_settings_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."consent_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."consent_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."email_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."feature_flags_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."feature_flags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."pages_blocks_image" CASCADE;
  DROP TABLE "cms"."pages_blocks_image_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_video" CASCADE;
  DROP TABLE "cms"."pages_blocks_video_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_form" CASCADE;
  DROP TABLE "cms"."pages_blocks_form_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_cta_buttons" CASCADE;
  DROP TABLE "cms"."pages_blocks_cta_buttons_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_cta" CASCADE;
  DROP TABLE "cms"."pages_blocks_cta_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_testimonials_items" CASCADE;
  DROP TABLE "cms"."pages_blocks_testimonials_items_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_testimonials" CASCADE;
  DROP TABLE "cms"."pages_blocks_testimonials_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_faq_items" CASCADE;
  DROP TABLE "cms"."pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_faq" CASCADE;
  DROP TABLE "cms"."pages_blocks_faq_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_countdown" CASCADE;
  DROP TABLE "cms"."pages_blocks_countdown_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_footer_links" CASCADE;
  DROP TABLE "cms"."pages_blocks_footer_links_locales" CASCADE;
  DROP TABLE "cms"."pages_blocks_footer" CASCADE;
  DROP TABLE "cms"."pages_blocks_footer_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_image" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_image_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_video" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_video_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_form" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_form_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_cta_buttons" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_cta_buttons_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_cta" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_cta_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_testimonials_items" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_testimonials_items_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_testimonials" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_testimonials_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_faq" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_countdown" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_countdown_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_footer_links" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_footer_links_locales" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_footer" CASCADE;
  DROP TABLE "cms"."_pages_v_blocks_footer_locales" CASCADE;
  DROP TABLE "cms"."funnels_steps" CASCADE;
  DROP TABLE "cms"."funnels" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_text" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_text_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_textarea" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_textarea_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_email" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_email_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_phone" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_phone_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_select_options" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_select_options_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_select" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_select_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_checkbox" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_checkbox_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_consent" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_consent_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_hidden" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_hidden_locales" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_country" CASCADE;
  DROP TABLE "cms"."forms_blocks_field_country_locales" CASCADE;
  DROP TABLE "cms"."forms" CASCADE;
  DROP TABLE "cms"."forms_locales" CASCADE;
  DROP TABLE "cms"."forms_rels" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_text" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_text_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_textarea" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_textarea_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_email" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_email_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_phone" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_phone_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_select_options" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_select_options_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_select" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_select_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_checkbox" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_checkbox_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_consent" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_consent_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_hidden" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_hidden_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_country" CASCADE;
  DROP TABLE "cms"."_forms_v_blocks_field_country_locales" CASCADE;
  DROP TABLE "cms"."_forms_v" CASCADE;
  DROP TABLE "cms"."_forms_v_locales" CASCADE;
  DROP TABLE "cms"."_forms_v_rels" CASCADE;
  DROP TABLE "cms"."experiments_variants" CASCADE;
  DROP TABLE "cms"."experiments" CASCADE;
  DROP TABLE "cms"."contacts" CASCADE;
  DROP TABLE "cms"."contacts_rels" CASCADE;
  DROP TABLE "cms"."form_submissions" CASCADE;
  DROP TABLE "cms"."tags" CASCADE;
  DROP TABLE "cms"."lists" CASCADE;
  DROP TABLE "cms"."segments" CASCADE;
  DROP TABLE "cms"."notes" CASCADE;
  DROP TABLE "cms"."custom_field_definitions" CASCADE;
  DROP TABLE "cms"."custom_field_definitions_texts" CASCADE;
  DROP TABLE "cms"."destinations_event_map" CASCADE;
  DROP TABLE "cms"."destinations" CASCADE;
  DROP TABLE "cms"."email_templates" CASCADE;
  DROP TABLE "cms"."email_sequences_steps" CASCADE;
  DROP TABLE "cms"."email_sequences_window_days" CASCADE;
  DROP TABLE "cms"."email_sequences" CASCADE;
  DROP TABLE "cms"."email_sequences_texts" CASCADE;
  DROP TABLE "cms"."email_sequences_rels" CASCADE;
  DROP TABLE "cms"."dsar_requests" CASCADE;
  DROP TABLE "cms"."tracking_settings" CASCADE;
  DROP TABLE "cms"."consent_settings_overrides" CASCADE;
  DROP TABLE "cms"."consent_settings" CASCADE;
  DROP TABLE "cms"."consent_settings_locales" CASCADE;
  DROP TABLE "cms"."email_settings" CASCADE;
  DROP TABLE "cms"."feature_flags_flags" CASCADE;
  DROP TABLE "cms"."feature_flags" CASCADE;
  ALTER TABLE "cms"."pages" DROP CONSTRAINT "pages_seo_image_id_media_id_fk";
  
  ALTER TABLE "cms"."_pages_v" DROP CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_funnels_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_experiments_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contacts_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tags_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lists_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_segments_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notes_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_custom_field_definitions_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_destinations_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_templates_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_sequences_fk";
  
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dsar_requests_fk";
  
  DROP INDEX "cms"."pages_seo_seo_image_idx";
  DROP INDEX "cms"."_pages_v_version_seo_version_seo_image_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_funnels_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_forms_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_experiments_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_contacts_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_form_submissions_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_tags_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_lists_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_segments_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_notes_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_custom_field_definitions_i_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_destinations_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_email_templates_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_email_sequences_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_dsar_requests_id_idx";
  ALTER TABLE "cms"."pages" DROP COLUMN "seo_image_id";
  ALTER TABLE "cms"."pages" DROP COLUMN "tracking_disable_tracking";
  ALTER TABLE "cms"."pages" DROP COLUMN "tracking_disable_pixels";
  ALTER TABLE "cms"."pages" DROP COLUMN "tracking_disable_autocapture";
  ALTER TABLE "cms"."pages" DROP COLUMN "tracking_page_event";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_seo_image_id";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_tracking_disable_tracking";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_tracking_disable_pixels";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_tracking_disable_autocapture";
  ALTER TABLE "cms"."_pages_v" DROP COLUMN "version_tracking_page_event";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "funnels_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "forms_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "experiments_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "contacts_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "tags_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "lists_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "segments_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "notes_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "custom_field_definitions_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "destinations_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "email_templates_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "email_sequences_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "dsar_requests_id";
  DROP TYPE "cms"."enum_pages_blocks_image_size";
  DROP TYPE "cms"."enum_pages_blocks_video_source";
  DROP TYPE "cms"."enum_pages_blocks_cta_buttons_style";
  DROP TYPE "cms"."enum__pages_v_blocks_image_size";
  DROP TYPE "cms"."enum__pages_v_blocks_video_source";
  DROP TYPE "cms"."enum__pages_v_blocks_cta_buttons_style";
  DROP TYPE "cms"."enum_funnels_steps_type";
  DROP TYPE "cms"."enum_forms_blocks_field_text_width";
  DROP TYPE "cms"."enum_forms_blocks_field_text_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_textarea_width";
  DROP TYPE "cms"."enum_forms_blocks_field_textarea_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_email_width";
  DROP TYPE "cms"."enum_forms_blocks_field_email_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_phone_width";
  DROP TYPE "cms"."enum_forms_blocks_field_phone_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_select_width";
  DROP TYPE "cms"."enum_forms_blocks_field_select_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_checkbox_width";
  DROP TYPE "cms"."enum_forms_blocks_field_checkbox_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_consent_width";
  DROP TYPE "cms"."enum_forms_blocks_field_consent_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_consent_purpose";
  DROP TYPE "cms"."enum_forms_blocks_field_hidden_width";
  DROP TYPE "cms"."enum_forms_blocks_field_hidden_map_to";
  DROP TYPE "cms"."enum_forms_blocks_field_country_width";
  DROP TYPE "cms"."enum_forms_blocks_field_country_map_to";
  DROP TYPE "cms"."enum_forms_on_success_type";
  DROP TYPE "cms"."enum_forms_actions_lifecycle_stage";
  DROP TYPE "cms"."enum_forms_status";
  DROP TYPE "cms"."enum__forms_v_blocks_field_text_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_text_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_textarea_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_textarea_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_email_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_email_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_phone_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_phone_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_select_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_select_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_checkbox_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_checkbox_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_consent_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_consent_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_consent_purpose";
  DROP TYPE "cms"."enum__forms_v_blocks_field_hidden_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_hidden_map_to";
  DROP TYPE "cms"."enum__forms_v_blocks_field_country_width";
  DROP TYPE "cms"."enum__forms_v_blocks_field_country_map_to";
  DROP TYPE "cms"."enum__forms_v_version_on_success_type";
  DROP TYPE "cms"."enum__forms_v_version_actions_lifecycle_stage";
  DROP TYPE "cms"."enum__forms_v_version_status";
  DROP TYPE "cms"."enum__forms_v_published_locale";
  DROP TYPE "cms"."enum_experiments_status";
  DROP TYPE "cms"."enum_contacts_lifecycle_stage";
  DROP TYPE "cms"."enum_contacts_marketing_status";
  DROP TYPE "cms"."enum_contacts_status";
  DROP TYPE "cms"."enum_form_submissions_status";
  DROP TYPE "cms"."enum_custom_field_definitions_type";
  DROP TYPE "cms"."enum_destinations_event_map_source";
  DROP TYPE "cms"."enum_destinations_type";
  DROP TYPE "cms"."enum_email_sequences_steps_delay_unit";
  DROP TYPE "cms"."enum_email_sequences_window_days";
  DROP TYPE "cms"."enum_email_sequences_trigger_type";
  DROP TYPE "cms"."enum_dsar_requests_type";
  DROP TYPE "cms"."enum_dsar_requests_regime";
  DROP TYPE "cms"."enum_dsar_requests_status";
  DROP TYPE "cms"."enum_consent_settings_overrides_regime";
  DROP TYPE "cms"."enum_consent_settings_default_regime";
  DROP TYPE "cms"."enum_email_settings_provider";`)
}
