import { createHmac } from 'node:crypto'
import { classifyHttp, type DestinationAdapter } from '@fp/destinations-sdk'

/**
 * Outbound webhooks per the Standard Webhooks spec (FR-DST-9, ADR-0014): headers webhook-id,
 * webhook-timestamp, webhook-signature `v1,<base64 HMAC-SHA256(secret, id.timestamp.body)>`.
 * The payload carries contact data by design: it is the lead hand-off to the user's own tools.
 */
export function signStandardWebhook(
  secret: string,
  id: string,
  timestamp: number,
  body: string,
): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`
}

export function verifyStandardWebhook(
  secret: string,
  headers: { id: string; timestamp: string; signature: string },
  body: string,
  toleranceSeconds = 300,
  now = Date.now(),
): boolean {
  const ts = Number(headers.timestamp)
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > toleranceSeconds) return false
  const expected = signStandardWebhook(secret, headers.id, ts, body)
  return headers.signature.split(' ').some((s) => s === expected)
}

export const webhook: DestinationAdapter = {
  type: 'webhook',
  supportsLimitedDataUse: false,
  requiredCredentials: ['webhookSecret'],
  prepare(ctx) {
    const { event, user } = ctx
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = {
      type: event.platformEvent,
      timestamp: new Date(timestamp * 1000).toISOString(),
      data: {
        event_id: event.eventId,
        event_name: event.name,
        occurred_at: event.occurredAt,
        contact: {
          id: user.contactId,
          email: user.email,
          phone: user.phone,
          first_name: user.firstName,
          last_name: user.lastName,
          country: user.country,
        },
        properties: event.properties,
        attribution: {
          page_url: event.pageUrl,
          referrer: event.referrer,
          utm: event.utm,
          click_ids: event.clickIds,
        },
        test: ctx.testMode,
      },
    }
    const body = JSON.stringify(payload)
    // Idempotency key for receivers: stable across retries of the same event.
    const id = `msg_${event.eventId}`
    return {
      url: ctx.destination.endpointUrl ?? '',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'funnel-platform-webhooks/1',
        'webhook-id': id,
        'webhook-timestamp': String(timestamp),
        'webhook-signature': signStandardWebhook(
          ctx.credentials.webhookSecret ?? '',
          id,
          timestamp,
          body,
        ),
      },
      body,
      summary: { type: event.platformEvent, has_email: !!user.email, test: ctx.testMode },
    }
  },
  classify(status, _body, headers) {
    // 410 Gone = endpoint retired: stop (Standard Webhooks guidance).
    if (status === 410) return { outcome: 'fatal', reason: 'endpoint_gone' }
    return classifyHttp(status, headers)
  },
}
