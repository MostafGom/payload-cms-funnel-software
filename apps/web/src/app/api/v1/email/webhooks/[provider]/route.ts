import { timingSafeEqual } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { repos } from '@fp/db'
import { cdp } from '@/lib/cdp'
import { serverEnv } from '@/lib/env'

/**
 * Bounce and complaint webhooks (FR-EML-3). Authenticated with a shared token
 * (`?token=` or `Authorization: Bearer`), configured in each provider's webhook URL.
 * Hard bounces and complaints suppress the address and exit sequences.
 */
type Normalized = {
  messageId: string
  status: 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked'
  hard: boolean
} | null

function normalize(provider: string, body: Record<string, unknown>): Normalized[] {
  if (provider === 'postmark') {
    const type = String(body.RecordType ?? '')
    const id = String(body.MessageID ?? '')
    if (type === 'Bounce')
      return [
        {
          messageId: id,
          status: 'bounced',
          hard: body.Type === 'HardBounce' || body.Inactive === true,
        },
      ]
    if (type === 'SpamComplaint') return [{ messageId: id, status: 'complained', hard: true }]
    if (type === 'Delivery') return [{ messageId: id, status: 'delivered', hard: false }]
    if (type === 'Open') return [{ messageId: id, status: 'opened', hard: false }]
    if (type === 'Click') return [{ messageId: id, status: 'clicked', hard: false }]
    return [null]
  }
  if (provider === 'resend') {
    const type = String(body.type ?? '')
    const id = String((body.data as Record<string, unknown> | undefined)?.email_id ?? '')
    const map: Record<string, Normalized> = {
      'email.bounced': { messageId: id, status: 'bounced', hard: true },
      'email.complained': { messageId: id, status: 'complained', hard: true },
      'email.delivered': { messageId: id, status: 'delivered', hard: false },
      'email.opened': { messageId: id, status: 'opened', hard: false },
      'email.clicked': { messageId: id, status: 'clicked', hard: false },
    }
    return [map[type] ?? null]
  }
  if (provider === 'ses') {
    // SNS notification wrapping an SES event.
    const msg =
      typeof body.Message === 'string'
        ? (JSON.parse(body.Message) as Record<string, unknown>)
        : body
    const type = String(msg.notificationType ?? msg.eventType ?? '')
    const id = String((msg.mail as Record<string, unknown> | undefined)?.messageId ?? '')
    if (type === 'Bounce')
      return [
        {
          messageId: id,
          status: 'bounced',
          hard: (msg.bounce as { bounceType?: string })?.bounceType === 'Permanent',
        },
      ]
    if (type === 'Complaint') return [{ messageId: id, status: 'complained', hard: true }]
    if (type === 'Delivery') return [{ messageId: id, status: 'delivered', hard: false }]
    return [null]
  }
  return [null]
}

const safeEq = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const expected = serverEnv().EMAIL_WEBHOOK_TOKEN
  const given =
    new URL(request.url).searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer /, '') ??
    ''
  if (!expected || !safeEq(given, expected))
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return Response.json({ error: 'invalid_json' }, { status: 400 })
  if (
    provider === 'ses' &&
    body.Type === 'SubscriptionConfirmation' &&
    typeof body.SubscribeURL === 'string'
  ) {
    // SNS subscription handshake.
    if (new URL(body.SubscribeURL).hostname.endsWith('.amazonaws.com'))
      await fetch(body.SubscribeURL)
    return Response.json({ ok: true })
  }
  const { sql } = cdp()
  let applied = 0
  for (const ev of normalize(provider, body)) {
    if (!ev?.messageId) continue
    const msg = await repos.emailStatusByProviderId(sql, provider, ev.messageId, ev.status)
    if (!msg) continue
    applied++
    if ((ev.status === 'bounced' && ev.hard) || ev.status === 'complained') {
      await repos.suppress(sql, {
        workspaceId: msg.workspace_id,
        emailHash: msg.to_hash,
        reason: ev.status === 'bounced' ? 'bounce' : 'complaint',
      })
      await repos.exitEnrollments(sql, msg.contact_id, ev.status)
      if (ev.status === 'complained') {
        const payload = await getPayload({ config })
        await payload
          .update({
            collection: 'contacts',
            id: msg.contact_id,
            overrideAccess: true,
            data: { marketingStatus: 'unsubscribed' },
            context: { actor: 'complaint' },
          })
          .catch(() => {})
      }
    }
  }
  return Response.json({ ok: true, applied })
}
