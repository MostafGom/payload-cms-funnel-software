/** Email provider port (FR-EML-3, ADR-0022). Adding a provider = one file implementing this. */
export interface OutgoingEmail {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
  text: string
  headers: Record<string, string>
  /** opaque id we can correlate in webhooks */
  messageId: string
  stream?: string
}

export interface EmailProvider {
  name: 'smtp' | 'postmark' | 'resend' | 'ses'
  send(m: OutgoingEmail): Promise<{ providerMessageId: string }>
}

/** `retryable` drives BullMQ retries; permanent errors fail the message. */
export class ProviderError extends Error {
  readonly retryable: boolean
  readonly status?: number
  constructor(message: string, retryable: boolean, status?: number) {
    super(message)
    this.retryable = retryable
    this.status = status
  }
}

export async function httpSend(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    throw new ProviderError(`network: ${String(err)}`, true)
  }
  const text = await res.text()
  if (!res.ok)
    throw new ProviderError(
      `${res.status}: ${text.slice(0, 300)}`,
      res.status === 429 || res.status >= 500,
      res.status,
    )
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}
