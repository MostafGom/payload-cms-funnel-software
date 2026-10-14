import {
  classifyHttp,
  compact,
  hashUser,
  matchKeys,
  unix,
  type DestinationAdapter,
} from '@fp/destinations-sdk'

export const TIKTOK_API_VERSION = 'v1.3'
const DEFAULT_BASE = 'https://business-api.tiktok.com'

/** TikTok Events API 2.0 (FR-DST-2/4/5/8). TikTok has no LDU: opted-out visitors are skipped. */
export const tiktokEvents: DestinationAdapter = {
  type: 'tiktok',
  supportsLimitedDataUse: false,
  requiredCredentials: ['accessToken'],
  prepare(ctx) {
    const { event, user, destination } = ctx
    const hu = hashUser(user)
    const u = compact({
      email: hu.em,
      phone: hu.ph,
      external_id: hu.external_id,
      ttclid: event.clickIds.ttclid ?? user.identifiers['click:ttclid'],
      ttp: user.identifiers.ttp,
      ip: event.ip ?? undefined,
      user_agent: event.userAgent ?? undefined,
    })
    const body = compact({
      event_source: 'web',
      event_source_id: destination.pixelId,
      test_event_code: ctx.testMode ? destination.testEventCode : undefined,
      data: [
        compact({
          event: event.platformEvent,
          event_time: unix(event.occurredAt),
          event_id: event.eventId,
          user: u,
          page: compact({ url: event.pageUrl ?? undefined, referrer: event.referrer ?? undefined }),
          properties: compact({
            content_name:
              typeof event.properties.form_id === 'string'
                ? `form:${event.properties.form_id}`
                : undefined,
          }),
        }),
      ],
    })
    return {
      url: `${ctx.baseUrl ?? DEFAULT_BASE}/open_api/${TIKTOK_API_VERSION}/event/track/`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Access-Token': ctx.credentials.accessToken ?? '',
      },
      body: JSON.stringify(body),
      summary: { event: event.platformEvent, match_keys: matchKeys(u), test: ctx.testMode },
    }
  },
  /** TikTok answers HTTP 200 with a business `code`; 0 is success. */
  classify(status, body, headers) {
    if (status !== 200) return classifyHttp(status, headers)
    try {
      const r = JSON.parse(body) as { code?: number; message?: string }
      if (r.code === 0) return { outcome: 'success' }
      if (r.code === 40100 || r.code === 51021 || (r.code ?? 0) >= 50000)
        return { outcome: 'retry', reason: `tiktok_${r.code}` }
      return { outcome: 'fatal', reason: `tiktok_${r.code}: ${r.message ?? ''}`.slice(0, 200) }
    } catch {
      return { outcome: 'retry', reason: 'tiktok_unparseable' }
    }
  },
}
