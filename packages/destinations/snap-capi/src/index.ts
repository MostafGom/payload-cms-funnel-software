import {
  classifyHttp,
  compact,
  hashUser,
  matchKeys,
  unix,
  type DestinationAdapter,
} from '@fp/destinations-sdk'

const DEFAULT_BASE = 'https://tr.snapchat.com'

/** Snap Conversions API v3 (FR-DST-3/4/5/8). Test mode uses the `/validate` endpoint. */
export const snapCapi: DestinationAdapter = {
  type: 'snap',
  supportsLimitedDataUse: false,
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
      sc_click_id: event.clickIds.ScCid ?? user.identifiers['click:ScCid'],
      sc_cookie1: user.identifiers.scid,
    })
    const body = {
      data: [
        compact({
          event_name: event.platformEvent,
          event_time: unix(event.occurredAt),
          event_id: event.eventId,
          action_source: 'website',
          event_source_url: event.pageUrl ?? undefined,
          user_data: userData,
          custom_data: compact({
            sign_up_method: typeof event.properties.form_id === 'string' ? 'form' : undefined,
          }),
        }),
      ],
    }
    const path = ctx.testMode ? 'events/validate' : 'events'
    return {
      url: `${ctx.baseUrl ?? DEFAULT_BASE}/v3/${encodeURIComponent(destination.pixelId ?? '')}/${path}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.credentials.accessToken ?? ''}`,
      },
      body: JSON.stringify(body),
      summary: {
        event_name: event.platformEvent,
        match_keys: matchKeys(userData),
        test: ctx.testMode,
      },
    }
  },
  classify(status, _body, headers) {
    if (status === 401 || status === 403) return { outcome: 'fatal', reason: 'snap_auth' }
    return classifyHttp(status, headers)
  },
}
