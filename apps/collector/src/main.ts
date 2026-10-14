import { serve } from '@hono/node-server'
import { createLogger } from '@fp/platform/logger'
import { startTelemetry } from '@fp/platform/otel'
import { createRedis } from '@fp/platform/redis'
import { createApp } from './app.ts'
import { loadCollectorEnv } from './env.ts'
import { createValkeyRateLimiter, createValkeySink } from './valkey.ts'

const env = loadCollectorEnv()
const logger = createLogger({ service: 'collector', level: env.LOG_LEVEL })
const telemetry = startTelemetry({
  service: 'collector',
  version: env.APP_VERSION,
  endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
})
const redis = createRedis(env.REDIS_URL)

const app = createApp({
  sink: createValkeySink(redis),
  rateLimiter: createValkeyRateLimiter(redis, env.RATE_LIMIT_EVENTS_PER_10S),
  logger,
  siteKeys: env.COLLECTOR_SITE_KEYS,
  cookieDomain: env.COLLECTOR_COOKIE_DOMAIN,
  clientIpHeader: env.CLIENT_IP_HEADER,
  consentOverrides: env.CONSENT_OVERRIDES,
  allowDebugGeo: env.ALLOW_DEBUG_GEO && env.NODE_ENV !== 'production',
  tracer: telemetry.tracer,
})

const server = serve({ fetch: app.fetch, port: env.COLLECTOR_PORT }, (info) =>
  logger.info({ port: info.port }, 'collector listening'),
)

// Graceful shutdown: stop accepting, let in-flight requests finish, then close Valkey.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'shutting down')
    server.close(() => {
      void Promise.allSettled([redis.quit(), telemetry.shutdown()]).finally(() => process.exit(0))
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
