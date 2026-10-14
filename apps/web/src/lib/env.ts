import { z } from 'zod'
import { baseEnv, databaseEnv, loadEnv, redisEnv, secretsEnv } from '@fp/platform/config'

const WebEnv = baseEnv
  .extend(databaseEnv.shape)
  .extend(redisEnv.shape)
  .extend(secretsEnv.shape)
  .extend({
    PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 chars'),
    NEXT_PUBLIC_SERVER_URL: z.url(),
    /** signs unsubscribe / double opt-in links (ADR-0022) */
    EMAIL_LINK_SECRET: z.string().min(32).optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    /** header carrying the client IP from the trusted proxy (Caddy / Cloudflare) */
    CLIENT_IP_HEADER: z.string().default('x-forwarded-for'),
    /** honour `x-fp-debug-geo: DE` for consent tests; never enable in production */
    ALLOW_DEBUG_GEO: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    FORM_RATE_LIMIT_PER_MIN: z.coerce.number().int().default(10),
    /** shared secret for provider webhooks (bounces) when the provider cannot sign */
    EMAIL_WEBHOOK_TOKEN: z.string().optional(),
  })
export type WebEnv = z.infer<typeof WebEnv>

let cached: WebEnv | undefined
/** Validated once per process; fails fast at boot on misconfiguration. */
export const serverEnv = (): WebEnv => (cached ??= loadEnv(WebEnv))

/** Secret used for signed email links; falls back to a derivation of PAYLOAD_SECRET. */
export const emailLinkSecret = (): string =>
  serverEnv().EMAIL_LINK_SECRET ?? `email-links:${serverEnv().PAYLOAD_SECRET}`
