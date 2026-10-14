import type { Sql } from '@fp/db'

/**
 * Read queries for dashboards (FR-ANL-1/2/3, ADR-0017). They read the journeys/sessions read
 * models and daily rollups, never scanning raw events for more than the requested window.
 * An `AnalyticsReadPort` boundary: swapping to ClickHouse later replaces this file only.
 */
export interface Range {
  from: string
  to: string
}

export async function funnelConversion(sql: Sql, funnelId: string, r: Range) {
  return sql<
    { variant_key: string; visitors: number; reached: Record<string, number>; converted: number }[]
  >`
    WITH j AS (
      SELECT coalesce(variant_key, '') AS variant_key, steps, converted_at
      FROM cdp.funnel_journeys
      WHERE funnel_id = ${funnelId} AND started_at >= ${r.from} AND started_at < ${r.to}
    ), s AS (
      SELECT variant_key, key AS step_id, count(*)::int AS n
      FROM j, jsonb_object_keys(steps) AS key GROUP BY 1, 2
    )
    SELECT j.variant_key, count(*)::int AS visitors,
      coalesce((SELECT jsonb_object_agg(step_id, n) FROM s WHERE s.variant_key = j.variant_key), '{}'::jsonb) AS reached,
      count(*) FILTER (WHERE converted_at IS NOT NULL)::int AS converted
    FROM j GROUP BY j.variant_key ORDER BY j.variant_key`
}

export async function sourceBreakdown(
  sql: Sql,
  r: Range,
  by: 'utm_source' | 'utm_campaign' | 'utm_medium' | 'channel' | 'click_id',
) {
  const dim =
    by === 'click_id'
      ? sql`coalesce((SELECT k FROM jsonb_object_keys(coalesce(click_ids, '{}'::jsonb)) k LIMIT 1), '(none)')`
      : by === 'channel'
        ? sql`CASE
            WHEN click_ids ? 'fbclid' OR utm_source ILIKE ANY (ARRAY['facebook%','fb','meta','instagram%','ig']) THEN 'Meta'
            WHEN click_ids ? 'ttclid' OR utm_source ILIKE 'tiktok%' THEN 'TikTok'
            WHEN click_ids ? 'ScCid' OR utm_source ILIKE 'snap%' THEN 'Snapchat'
            WHEN click_ids ? 'gclid' OR click_ids ? 'gbraid' OR click_ids ? 'wbraid' THEN 'Google Ads'
            WHEN utm_medium ILIKE ANY (ARRAY['email','newsletter']) THEN 'Email'
            WHEN utm_source IS NOT NULL THEN 'Other campaign'
            WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
            ELSE 'Referral' END`
        : sql`coalesce(${sql(by)}, '(none)')`
  return sql<{ key: string; sessions: number; conversions: number; rate: number }[]>`
    SELECT ${dim} AS key, count(*)::int AS sessions,
      count(*) FILTER (WHERE converted)::int AS conversions,
      round(100.0 * count(*) FILTER (WHERE converted) / greatest(count(*), 1), 2)::float AS rate
    FROM cdp.sessions
    WHERE started_at >= ${r.from} AND started_at < ${r.to} AND NOT is_bot
    GROUP BY 1 ORDER BY sessions DESC LIMIT 50`
}

export async function dailyTotals(sql: Sql, r: Range) {
  return sql<{ day: string; sessions: number; conversions: number }[]>`
    SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day, count(*)::int AS sessions,
      count(*) FILTER (WHERE converted)::int AS conversions
    FROM cdp.sessions WHERE started_at >= ${r.from} AND started_at < ${r.to} AND NOT is_bot
    GROUP BY 1 ORDER BY 1`
}

export async function contactTimeline(sql: Sql, contactId: string, limit = 200) {
  return sql<{ at: string; kind: string; title: string; detail: Record<string, unknown> | null }[]>`
    (SELECT occurred_at AS at, 'event' AS kind, name AS title,
        jsonb_build_object('path', page_path, 'utm_source', utm_source, 'source', source) AS detail
      FROM cdp.events WHERE contact_id = ${contactId} ORDER BY occurred_at DESC LIMIT ${limit})
    UNION ALL
    (SELECT created_at, 'email', coalesce(subject, kind), jsonb_build_object('status', status, 'kind', kind)
      FROM cdp.email_messages WHERE contact_id = ${contactId} ORDER BY created_at DESC LIMIT ${limit})
    UNION ALL
    (SELECT recorded_at, 'consent', 'consent ' || regime,
        jsonb_build_object('analytics', analytics, 'marketing', marketing, 'region', region, 'source', source)
      FROM cdp.consent_records WHERE contact_id = ${contactId} ORDER BY recorded_at DESC LIMIT 50)
    UNION ALL
    (SELECT created_at, 'delivery', destination_type || ' ' || coalesce(platform_event, event_name),
        jsonb_build_object('status', status, 'attempts', attempts)
      FROM cdp.destination_deliveries WHERE contact_id = ${contactId} ORDER BY created_at DESC LIMIT 100)
    UNION ALL
    (SELECT entered_at, 'segment', 'entered segment', jsonb_build_object('segment_id', segment_id)
      FROM cdp.segment_memberships WHERE contact_id = ${contactId})
    ORDER BY at DESC LIMIT ${limit}`
}
