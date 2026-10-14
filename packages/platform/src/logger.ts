import { pino, type Logger } from 'pino'

/**
 * PII must never reach logs (ADR-0012). Redaction covers common shapes; anything else that
 * might hold PII must be hashed before logging.
 */
export const REDACT_PATHS = [
  'email',
  'phone',
  'ip',
  'password',
  'token',
  'authorization',
  '*.email',
  '*.phone',
  '*.ip',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.secret',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
]

export interface LoggerOptions {
  service: string
  level?: string
  /** Test hook: write to a custom destination (e.g. to scan output for PII). */
  destination?: pino.DestinationStream
}

export function createLogger({ service, level = 'info', destination }: LoggerOptions): Logger {
  return pino(
    {
      level,
      base: { service },
      redact: { paths: REDACT_PATHS, censor: '[redacted]' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
    },
    destination,
  )
}

export type { Logger }
