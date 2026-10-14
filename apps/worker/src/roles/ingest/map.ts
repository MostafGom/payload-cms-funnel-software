import { extractAttribution } from '@fp/attribution'
import type { EnrichedEvent } from '@fp/event-schemas'
import type { schema } from '@fp/db'

type EventRow = schema.EventRow

/** Pure mapping from the stream payload to a `cdp.events` row. Full IP is intentionally dropped. */
export function toEventRow(e: EnrichedEvent): EventRow {
  const { utm, clickIds } = extractAttribution(e.page.url)
  return {
    workspaceId: e.workspace_id,
    eventId: e.event_id,
    receivedAt: e.received_at,
    occurredAt: e.occurred_at_corrected,
    name: e.name,
    schemaV: e.schema_v,
    source: e.source,
    anonymousId: e.anonymous_id ?? null,
    contactId: e.contact_id ?? null,
    sessionId: e.session_id,
    funnelId: e.funnel?.funnel_id ?? null,
    stepId: e.funnel?.step_id ?? null,
    variantKey: e.funnel?.variant_key ?? null,
    pageUrl: e.page.url,
    pagePath: e.page.path,
    referrer: e.page.referrer ?? null,
    utmSource: utm.utm_source ?? null,
    utmMedium: utm.utm_medium ?? null,
    utmCampaign: utm.utm_campaign ?? null,
    utmTerm: utm.utm_term ?? null,
    utmContent: utm.utm_content ?? null,
    clickIds: Object.keys(clickIds).length ? clickIds : null,
    properties: e.properties,
    // regime/gpc travel with the row so later deliveries (retries, replays) gate identically.
    context: {
      ...e.context,
      sdk_v: e.sdk_v,
      title: e.page.title,
      region: e.region,
      regime: e.regime,
      gpc: e.gpc,
    },
    deviceType: e.device.type,
    os: e.device.os,
    browser: e.device.browser,
    geoCountry: e.geo.country,
    geoRegion: e.geo.region,
    geoCity: e.geo.city,
    ipTrunc: e.ip_trunc,
    consent: e.consent_mask,
    isBot: e.is_bot,
    sdkV: e.sdk_v,
  }
}
