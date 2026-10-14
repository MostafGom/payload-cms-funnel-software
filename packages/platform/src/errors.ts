/**
 * Application error carrying a stable machine-readable code. HTTP adapters turn it into
 * RFC 9457 problem+json (ADR-0021); workers use `retryable` to decide on backoff.
 */
export class AppError extends Error {
  readonly code: string
  readonly status: number
  readonly retryable: boolean
  readonly details?: unknown

  constructor(
    code: string,
    message: string,
    opts: { status?: number; retryable?: boolean; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause })
    this.name = 'AppError'
    this.code = code
    this.status = opts.status ?? 500
    this.retryable = opts.retryable ?? false
    this.details = opts.details
  }
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  code: string
  detail?: string
  errors?: unknown
}

export function toProblem(err: unknown): ProblemDetails {
  if (err instanceof AppError) {
    return {
      type: `https://errors.funnel-platform.dev/${err.code}`,
      title: err.message,
      status: err.status,
      code: err.code,
      errors: err.details,
    }
  }
  return { type: 'about:blank', title: 'Internal Server Error', status: 500, code: 'internal' }
}
