import { Worker, type ConnectionOptions, type Job } from 'bullmq'
import type { EmailSettingsSnapshot, EmailTemplateSnapshot } from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { CONFIRM_TTL, createLinkToken, renderEmail, UNSUBSCRIBE_TTL } from '@fp/email'
import {
  postmarkProvider,
  ProviderError,
  resendProvider,
  sesProvider,
  smtpProvider,
  type EmailProvider,
} from '@fp/email-providers'
import { decryptSecret, type Keyring } from '@fp/platform/crypto'
import type { Logger } from '@fp/platform/logger'
import { EMAIL_QUEUE, QUEUE_PREFIX, type EmailJob } from '../../lib/queues.ts'
import type { SnapshotCache } from '../../lib/snapshots.ts'

/** Used when a form enables double opt-in without choosing a template. */
export const DEFAULT_DOI_TEMPLATE: EmailTemplateSnapshot = {
  id: 'builtin:double_opt_in',
  name: 'Confirm your subscription',
  subject: 'Please confirm your email',
  html: '<p>Hi {{firstName}},</p><p>Please confirm your subscription:</p><p><a href="{{confirmUrl}}">Confirm my email</a></p><p>If you did not sign up, ignore this email.</p>',
  text: 'Hi {{firstName}},\n\nPlease confirm your subscription: {{confirmUrl}}\n\nIf you did not sign up, ignore this email.',
}

const DEFAULT_SETTINGS: EmailSettingsSnapshot = {
  provider: 'smtp',
  fromName: 'Funnel Platform',
  fromEmail: 'hello@example.com',
  postalAddress: '',
}

export interface EmailDeps {
  sql: Sql
  snapshots: SnapshotCache
  keyring: Keyring
  logger: Logger
  publicBaseUrl: string
  linkSecret: string
  smtp: { host: string; port: number; user?: string; pass?: string }
  providerBaseUrl?: string
}

export function providerFor(settings: EmailSettingsSnapshot, deps: EmailDeps): EmailProvider {
  const creds = settings.credentials
    ? (JSON.parse(decryptSecret(settings.credentials, deps.keyring)) as {
        apiKey?: string
        region?: string
      })
    : {}
  switch (settings.provider) {
    case 'postmark':
      return postmarkProvider({
        serverToken: creds.apiKey ?? '',
        baseUrl: deps.providerBaseUrl,
        defaultStream: settings.messageStream,
      })
    case 'resend':
      return resendProvider({ apiKey: creds.apiKey ?? '', baseUrl: deps.providerBaseUrl })
    case 'ses': {
      const [accessKeyId = '', secretAccessKey = ''] = (creds.apiKey ?? '').split(':')
      return sesProvider({
        accessKeyId,
        secretAccessKey,
        region: creds.region ?? 'us-east-1',
        baseUrl: deps.providerBaseUrl,
      })
    }
    default:
      return smtpProvider(deps.smtp)
  }
}

export type SendOutcome = 'sent' | 'suppressed' | 'skipped' | 'duplicate'

/**
 * Sends one email (FR-EML-1..4). Marketing mail honours every suppression; double opt-in and
 * transactional mail ignore an earlier *unsubscribe* (the person just asked for it) but never a
 * bounce, complaint or erasure.
 */
export async function sendEmail(
  deps: EmailDeps,
  job: EmailJob,
  provider?: EmailProvider,
): Promise<SendOutcome> {
  const contact = await repos.getContact(deps.sql, job.contactId)
  if (!contact?.email || !contact.email_hash || contact.status !== 'active') return 'skipped'
  const suppression = await repos.isSuppressed(deps.sql, 1, contact.email_hash)
  const marketing = job.kind === 'sequence'
  const blocked = suppression && (marketing || suppression !== 'unsubscribe')

  const template =
    (job.templateId ? await deps.snapshots.get('email_template', job.templateId) : undefined) ??
    (job.kind === 'double_opt_in' ? DEFAULT_DOI_TEMPLATE : undefined)
  if (!template) {
    deps.logger.warn({ templateId: job.templateId }, 'email template missing; skipping')
    return 'skipped'
  }
  const settings = (await deps.snapshots.get('email_settings', 'global')) ?? DEFAULT_SETTINGS
  const p = provider ?? providerFor(settings, deps)

  const base = deps.publicBaseUrl.replace(/\/$/, '')
  const vars = {
    firstName: contact.first_name ?? 'there',
    lastName: contact.last_name ?? '',
    email: contact.email,
    confirmUrl: `${base}/api/v1/email/confirm?t=${createLinkToken(deps.linkSecret, 'confirm', contact.id, CONFIRM_TTL)}`,
    ...job.vars,
  }
  const unsubscribeUrl = `${base}/api/v1/email/unsubscribe?t=${createLinkToken(deps.linkSecret, 'unsub', contact.id, UNSUBSCRIBE_TTL)}`
  const rendered = renderEmail(template, vars, {
    unsubscribeUrl,
    postalAddress: settings.postalAddress,
    marketing,
  })
  const isNew = await repos.insertEmailMessage(deps.sql, {
    id: job.messageId,
    workspaceId: 1,
    contactId: contact.id,
    kind: job.kind,
    templateId: template.id,
    sequenceId: job.sequenceId ?? null,
    enrollmentId: job.enrollmentId ?? null,
    stepIndex: job.stepIndex ?? null,
    toHash: contact.email_hash,
    subject: rendered.subject,
    provider: p.name,
    status: blocked ? 'suppressed' : 'queued',
  })
  if (!isNew) {
    const [m] = await deps.sql<
      { status: string }[]
    >`SELECT status FROM cdp.email_messages WHERE id = ${job.messageId}`
    if (m && m.status !== 'queued' && m.status !== 'failed') return 'duplicate'
  }
  if (blocked) return 'suppressed'

  try {
    const r = await p.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: contact.email,
      replyTo: settings.replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: rendered.headers,
      messageId: job.messageId,
      stream: settings.messageStream,
    })
    await repos.updateEmailMessage(deps.sql, job.messageId, {
      status: 'sent',
      providerMessageId: r.providerMessageId,
      sent: true,
    })
    return 'sent'
  } catch (err) {
    const retryable = err instanceof ProviderError ? err.retryable : true
    await repos.updateEmailMessage(deps.sql, job.messageId, {
      status: 'failed',
      error: String(err).slice(0, 500),
    })
    if (retryable) throw err
    return 'skipped'
  }
}

export function startEmailWorker(
  deps: EmailDeps & { connection: ConnectionOptions },
  signal: AbortSignal,
): Promise<void> {
  const worker = new Worker<EmailJob>(
    EMAIL_QUEUE,
    (job: Job<EmailJob>) => sendEmail(deps, job.data),
    {
      connection: deps.connection,
      prefix: QUEUE_PREFIX,
      concurrency: 5,
      limiter: { max: 20, duration: 1000 },
    },
  )
  worker.on('failed', (job, err) =>
    deps.logger.warn({ err: String(err), messageId: job?.data.messageId }, 'email send failed'),
  )
  return new Promise((resolve) =>
    signal.addEventListener('abort', () => void worker.close().then(() => resolve())),
  )
}
