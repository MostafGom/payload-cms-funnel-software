import {
  classifyHttp,
  compact,
  hashUser,
  matchKeys,
  unix,
  type DestinationAdapter,
} from '@fp/destinations-sdk'

/** Pinned Graph API version (plan §10: version pins + golden fixtures). Bump deliberately. */
export const GRAPH_VERSION = 'v23.0'
const DEFAULT_BASE = 'https://graph.facebook.com'

/** Meta Conversions API (FR-DST-1/4/5/6/8). */
export const metaCapi: DestinationAdapter = {
  type: 'meta',
  supportsLimitedDataUse: true,
  requiredCredentials: ['accessToken'],
  prepare(ctx) {
    const { event, user, destination } = ctx
    const hu = hashUser(user)
    const userData = compact({
      em: hu.em ? [hu.em] : undefined,
      ph: hu.ph ? [hu.ph] : undefined,
      fn: hu.fn ? [hu.fn] : undefined,
      ln: hu.ln ? [hu.ln] : undefined,
      ct: hu.ct ? [hu.ct] : undefined,
      country: hu.country ? [hu.country] : undefined,
      external_id: hu.external_id ? [hu.external_id] : undefined,
      client_ip_address: event.ip ?? undefined,
      client_user_agent: event.userAgent ?? undefined,
      fbc:
        user.identifiers.fbc ??
        (event.clickIds.fbclid
          ? `fb.1.${new Date(event.occurredAt).getTime()}.${event.clickIds.fbclid}`
          : undefined),
      fbp: user.identifiers.fbp,
    })
    const data = compact({
      event_name: event.platformEvent,
      event_time: unix(event.occurredAt),
      event_id: event.eventId,
      action_source: 'website',
      event_source_url: event.pageUrl ?? undefined,
      user_data: userData,
      custom_data: compact({
        content_name:
          typeof event.properties.form_id === 'string'
            ? `form:${event.properties.form_id}`
            : undefined,
        lead_event_source: 'funnel-platform',
      }),
      // LDU with country/state 0 lets Meta geolocate (FR-DST-6).
      ...(ctx.limitedDataUse
        ? {
            data_processing_options: ['LDU'],
            data_processing_options_country: 0,
            data_processing_options_state: 0,
          }
        : {}),
    })
    const body = compact({
      data: [data],
      test_event_code: ctx.testMode ? destination.testEventCode : undefined,
      access_token: ctx.credentials.accessToken,
    })
    return {
      url: `${ctx.baseUrl ?? DEFAULT_BASE}/${GRAPH_VERSION}/${encodeURIComponent(destination.pixelId ?? '')}/events`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      summary: {
        event_name: event.platformEvent,
        match_keys: matchKeys(userData),
        ldu: ctx.limitedDataUse,
        test: ctx.testMode,
      },
    }
  },
  classify(status, body, headers) {
    if (status >= 200 && status < 300) return { outcome: 'success' }
    try {
      const err = (
        JSON.parse(body) as { error?: { code?: number; is_transient?: boolean; message?: string } }
      ).error
      if (err?.is_transient || [1, 2, 4, 17, 32, 341, 613].includes(err?.code ?? -1))
        return { outcome: 'retry', reason: `meta_${err?.code}` }
      if (err?.code === 190) return { outcome: 'fatal', reason: 'meta_invalid_token' }
      if (err)
        return { outcome: 'fatal', reason: `meta_${err.code}: ${err.message ?? ''}`.slice(0, 200) }
    } catch {
      /* not JSON */
    }
    return classifyHttp(status, headers)
  },
}
