import { createDb } from '@fp/db'
import { STREAMS } from '@fp/event-schemas'
import { parseKeyring } from '@fp/platform/crypto'
import { createLogger } from '@fp/platform/logger'
import { startTelemetry } from '@fp/platform/otel'
import { createRedis } from '@fp/platform/redis'
import { loadWorkerEnv } from './env.ts'
import { createQueues } from './lib/queues.ts'
import { createSnapshotCache } from './lib/snapshots.ts'
import { startDestinationWorkers } from './roles/destinations/supervisor.ts'
import { startEmailWorker } from './roles/email/send.ts'
import { createIngestConsumer } from './roles/ingest/consumer.ts'
import { createReadModels } from './roles/ingest/readmodels.ts'
import { createRelay } from './roles/relay/relay.ts'
import { startScheduler } from './roles/scheduler/index.ts'

const env = loadWorkerEnv()
const logger = createLogger({ service: 'worker', level: env.LOG_LEVEL })

// postgres.js 3.4.9 can throw from a timer when its socket closes mid-write during a database
// outage (`socket.write` on null). The connection is already dead and is re-opened on the next
// query, so that one error is survivable. Anything else is fatal: exit and let the supervisor
// restart us (at-least-once processing makes restarts safe).
process.on('uncaughtException', (err) => {
  const benign =
    err instanceof TypeError &&
    /reading 'write'/.test(err.message) &&
    /postgres\/src\/connection\.js/.test(err.stack ?? '')
  if (benign) return logger.warn({ err }, 'ignored postgres.js socket race during outage')
  logger.fatal({ err }, 'uncaught exception')
  process.exit(1)
})
const telemetry = startTelemetry({
  service: 'worker',
  version: env.APP_VERSION,
  endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
})
const redis = createRedis(env.REDIS_URL)
// BullMQ wants its own connections (blocking commands); ioredis options are shared.
const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null }
const { sql, db } = createDb(env.DATABASE_URL, { appName: 'fp-worker', max: 15 })
const keyring = parseKeyring(env.SECRETS_KEYRING, env.SECRETS_CURRENT_KEY)
const snapshots = createSnapshotCache(sql)
const queues = createQueues(connection)
const controller = new AbortController()
const { signal } = controller

const running: Promise<void>[] = []
for (const role of env.WORKER_ROLES) {
  const log = logger.child({ role })
  switch (role) {
    case 'ingest': {
      const consumer = createIngestConsumer({
        redis,
        sql,
        db,
        logger: log,
        tracer: telemetry.tracer,
        consumer: env.WORKER_NAME,
        batchSize: env.INGEST_BATCH_SIZE,
        afterInsert: createReadModels({ snapshots, queues, keyring }),
      })
      running.push(consumer.run(signal))
      break
    }
    case 'relay':
      running.push(createRelay({ sql, redis, queues, snapshots, keyring, logger: log }).run(signal))
      break
    case 'destinations':
      running.push(
        startDestinationWorkers(
          {
            sql,
            snapshots,
            keyring,
            logger: log,
            connection,
            tracer: telemetry.tracer,
            meter: telemetry.meter,
            concurrency: env.DESTINATION_CONCURRENCY,
            allowPrivateWebhooks: env.ALLOW_PRIVATE_WEBHOOKS && env.NODE_ENV !== 'production',
            baseUrls: {
              meta: env.META_BASE_URL,
              tiktok: env.TIKTOK_BASE_URL,
              snap: env.SNAP_BASE_URL,
            },
          },
          signal,
        ),
      )
      break
    case 'email':
      running.push(
        startEmailWorker(
          {
            sql,
            snapshots,
            keyring,
            logger: log,
            connection,
            publicBaseUrl: env.PUBLIC_BASE_URL,
            linkSecret: env.EMAIL_LINK_SECRET,
            smtp: {
              host: env.SMTP_HOST,
              port: env.SMTP_PORT,
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
            providerBaseUrl: env.EMAIL_PROVIDER_BASE_URL,
          },
          signal,
        ),
      )
      break
    case 'scheduler':
      running.push(
        startScheduler(
          { sql, redis, queues, snapshots, logger: log, meter: telemetry.meter },
          log,
          signal,
        ),
      )
      break
  }
}
// Backlog gauges for the SLO dashboard and alerts (ADR-0018).
const meter = telemetry.meter
const gauge = (name: string, description: string, read: () => Promise<number>) => {
  let last = 0
  meter.createObservableGauge(name, { description }).addCallback((r) => r.observe(last))
  const t = setInterval(
    () =>
      void read()
        .then((v) => (last = v))
        .catch(() => {}),
    15_000,
  )
  t.unref()
}
if (env.WORKER_ROLES.includes('scheduler')) {
  gauge('fp_ingest_stream_pending', 'Entries waiting in the ingest stream', () =>
    redis.xlen(STREAMS.ingest),
  )
  gauge('fp_ingest_dlq_length', 'Entries in the ingest DLQ', () => redis.xlen(STREAMS.ingestDlq))
  gauge(
    'fp_outbox_pending',
    'Unpublished outbox rows',
    async () =>
      (
        await sql<
          { n: number }[]
        >`SELECT count(*)::int AS n FROM cdp.outbox WHERE published_at IS NULL`
      )[0]?.n ?? 0,
  )
}
logger.info({ roles: env.WORKER_ROLES, name: env.WORKER_NAME }, 'worker started')

for (const s of ['SIGTERM', 'SIGINT'] as const) {
  process.once(s, async () => {
    logger.info({ signal: s }, 'shutting down; finishing current work')
    controller.abort()
    setTimeout(() => process.exit(1), 20_000).unref()
    await Promise.allSettled(running)
    await Promise.allSettled([queues.close(), sql.end(), redis.quit(), telemetry.shutdown()])
    process.exit(0)
  })
}
