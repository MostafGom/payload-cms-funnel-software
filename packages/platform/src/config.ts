import { z } from 'zod'

/**
 * Parses environment variables against a Zod schema and fails fast at boot with a readable
 * message listing every invalid key. Never prints values, since they may be secrets.
 */
export function loadEnv<S extends z.ZodType>(
  schema: S,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<S> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    )
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`)
  }
  return result.data
}

/** Fragments shared by every deployable so names and defaults stay consistent. */
export const baseEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SERVICE_NAME: z.string().min(1).optional(),
})

export const redisEnv = z.object({
  REDIS_URL: z.url(),
})

export const databaseEnv = z.object({
  DATABASE_URL: z.url(),
})

export const telemetryEnv = z.object({
  /** OTLP/HTTP endpoint (ADR-0018). Unset disables export; spans become no-ops. */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  APP_VERSION: z.string().default('0.0.0'),
})

export const secretsEnv = z.object({
  /** `id:<base64 32 bytes>[,id2:...]` (ADR-0012) */
  SECRETS_KEYRING: z.string().min(1),
  SECRETS_CURRENT_KEY: z.string().min(1),
})
