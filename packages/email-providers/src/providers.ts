import { createHash, createHmac } from 'node:crypto'
import nodemailer from 'nodemailer'
import { httpSend, ProviderError, type EmailProvider, type OutgoingEmail } from './types.ts'

export function smtpProvider(o: {
  host: string
  port: number
  secure?: boolean
  user?: string
  pass?: string
}): EmailProvider {
  const transport = nodemailer.createTransport({
    host: o.host,
    port: o.port,
    secure: o.secure ?? false,
    auth: o.user ? { user: o.user, pass: o.pass } : undefined,
  })
  return {
    name: 'smtp',
    async send(m) {
      try {
        const info = await transport.sendMail({
          from: m.from,
          to: m.to,
          replyTo: m.replyTo,
          subject: m.subject,
          html: m.html,
          text: m.text,
          headers: { ...m.headers, 'X-FP-Message-Id': m.messageId },
          messageId: `<${m.messageId}@funnel-platform>`,
        })
        return { providerMessageId: info.messageId }
      } catch (err) {
        throw new ProviderError(`smtp: ${String(err)}`, true)
      }
    },
  }
}

export function postmarkProvider(o: {
  serverToken: string
  baseUrl?: string
  defaultStream?: string
}): EmailProvider {
  return {
    name: 'postmark',
    async send(m) {
      const r = await httpSend(`${o.baseUrl ?? 'https://api.postmarkapp.com'}/email`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'X-Postmark-Server-Token': o.serverToken,
        },
        body: JSON.stringify({
          From: m.from,
          To: m.to,
          ReplyTo: m.replyTo,
          Subject: m.subject,
          HtmlBody: m.html,
          TextBody: m.text,
          Headers: Object.entries(m.headers).map(([Name, Value]) => ({ Name, Value })),
          Metadata: { fp_message_id: m.messageId },
          MessageStream: m.stream ?? o.defaultStream ?? 'outbound',
        }),
      })
      return { providerMessageId: String(r.MessageID ?? '') }
    },
  }
}

export function resendProvider(o: { apiKey: string; baseUrl?: string }): EmailProvider {
  return {
    name: 'resend',
    async send(m) {
      const r = await httpSend(`${o.baseUrl ?? 'https://api.resend.com'}/emails`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${o.apiKey}`,
          'content-type': 'application/json',
          'Idempotency-Key': m.messageId,
        },
        body: JSON.stringify({
          from: m.from,
          to: [m.to],
          reply_to: m.replyTo,
          subject: m.subject,
          html: m.html,
          text: m.text,
          headers: m.headers,
        }),
      })
      return { providerMessageId: String(r.id ?? '') }
    },
  }
}

/** Amazon SES v2 SendEmail with a hand-rolled SigV4 signature (no AWS SDK dependency). */
export function sesProvider(o: {
  accessKeyId: string
  secretAccessKey: string
  region: string
  baseUrl?: string
  now?: () => Date
}): EmailProvider {
  return {
    name: 'ses',
    async send(m) {
      const host = `email.${o.region}.amazonaws.com`
      const path = '/v2/email/outbound-emails'
      const body = JSON.stringify({
        FromEmailAddress: m.from,
        Destination: { ToAddresses: [m.to] },
        ReplyToAddresses: m.replyTo ? [m.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: m.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: m.html, Charset: 'UTF-8' },
              Text: { Data: m.text, Charset: 'UTF-8' },
            },
            Headers: Object.entries(m.headers).map(([Name, Value]) => ({ Name, Value })),
          },
        },
        EmailTags: [{ Name: 'fp_message_id', Value: m.messageId.replace(/[^\w-]/g, '_') }],
      })
      const headers = sigV4({
        method: 'POST',
        host,
        path,
        body,
        region: o.region,
        service: 'ses',
        accessKeyId: o.accessKeyId,
        secretAccessKey: o.secretAccessKey,
        now: o.now?.() ?? new Date(),
      })
      const r = await httpSend(`${o.baseUrl ?? `https://${host}`}${path}`, {
        method: 'POST',
        headers,
        body,
      })
      return { providerMessageId: String(r.MessageId ?? '') }
    },
  }
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const hmac = (k: Buffer | string, s: string) => createHmac('sha256', k).update(s, 'utf8').digest()

/** AWS Signature Version 4 for a JSON POST (exported for its test vector). */
export function sigV4(r: {
  method: string
  host: string
  path: string
  body: string
  region: string
  service: string
  accessKeyId: string
  secretAccessKey: string
  now: Date
}): Record<string, string> {
  const amzDate = r.now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const payloadHash = sha(r.body)
  const canonicalHeaders = `content-type:application/json\nhost:${r.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonical = [r.method, r.path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const scope = `${date}/${r.region}/${r.service}/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n')
  const kDate = hmac(`AWS4${r.secretAccessKey}`, date)
  const kSigning = hmac(hmac(hmac(kDate, r.region), r.service), 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(toSign, 'utf8').digest('hex')
  return {
    'content-type': 'application/json',
    host: r.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${r.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

export type { OutgoingEmail }
