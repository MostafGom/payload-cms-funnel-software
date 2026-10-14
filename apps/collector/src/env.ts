import { z } from 'zod'
import { baseEnv, loadEnv, redisEnv, telemetryEnv } from '@fp/platform/config'

export const CollectorEnv = baseEnv
  .extend(redisEnv.shape)
  .extend(telemetryEnv.shape)
  .extend({
    COLLECTOR_PORT: z.coerce.number().int().default(3100),
    /** e.g. `.brand.com` so cookies cover the apex and every funnel subdomain; empty = host-only */
    COLLECTOR_COOKIE_DOMAIN: z.string().default(''),
    /** `siteKey:workspaceId` pairs, comma separated (ADR-0013) */
    COLLECTOR_SITE_KEYS: z
      .string()
      .min(1)
      .transform(
        (s) =>
          new Map(
            s
              .split(',')
              .map((p) => p.trim().split(':'))
              .map(([k, w]) => [k!, Number(w)]),
          ),
      ),
    /** header carrying the real client IP, set by the trusted proxy in front (Caddy / Cloudflare) */
    CLIENT_IP_HEADER: z.string().default('x-forwarded-for'),
    RATE_LIMIT_EVENTS_PER_10S: z.coerce.number().int().default(300),
    /** `REGION:regime` pairs, e.g. `JP:opt_in,US-CA:opt_in`; mirrors ConsentSettings overrides */
    CONSENT_OVERRIDES: z
      .string()
      .default('')
      .transform((s) => ({
        overrides: s
          .split(',')
          .map((p) => p.trim().split(':'))
          .filter(([r, g]) => r && ['opt_in', 'opt_out', 'notice'].includes(g ?? ''))
          .map(([region, regime]) => ({
            region: region!.toUpperCase(),
            regime: regime as 'opt_in',
          })),
      })),
    ALLOW_DEBUG_GEO: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
export type CollectorEnv = z.infer<typeof CollectorEnv>

export const loadCollectorEnv = (): CollectorEnv => loadEnv(CollectorEnv)
