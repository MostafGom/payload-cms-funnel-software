import { hostname } from 'node:os'
import { z } from 'zod'
import {
  baseEnv,
  databaseEnv,
  loadEnv,
  redisEnv,
  secretsEnv,
  telemetryEnv,
} from '@fp/platform/config'

export const ROLES = ['ingest', 'relay', 'destinations', 'email', 'scheduler'] as const
export type Role = (typeof ROLES)[number]

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true')

export const WorkerEnv = baseEnv
  .extend(redisEnv.shape)
  .extend(databaseEnv.shape)
  .extend(telemetryEnv.shape)
  .extend(secretsEnv.shape)
  .extend({
    /** Comma-separated roles this process runs (ADR-0001). Split roles across containers to scale. */
    WORKER_ROLES: z
      .string()
      .default(ROLES.join(','))
      .transform((s) => s.split(',').map((r) => r.trim()))
      .pipe(z.array(z.enum(ROLES)).min(1)),
    /** Unique per replica; used as the stream consumer name. */
    WORKER_NAME: z.string().default(`${hostname()}-${process.pid}`),
    INGEST_BATCH_SIZE: z.coerce.number().int().min(1).max(5000).default(500),
    /** public origin for links in email (unsubscribe, confirm) */
    PUBLIC_BASE_URL: z.url().default('http://localhost:8080'),
    /** must equal the web app's EMAIL_LINK_SECRET */
    EMAIL_LINK_SECRET: z.string().min(32),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    /** base URL overrides for mock destinations in dev/e2e (never set in production) */
    META_BASE_URL: z.url().optional(),
    TIKTOK_BASE_URL: z.url().optional(),
    SNAP_BASE_URL: z.url().optional(),
    EMAIL_PROVIDER_BASE_URL: z.url().optional(),
    /** allow webhooks to private/loopback addresses (dev and e2e only) */
    ALLOW_PRIVATE_WEBHOOKS: bool,
    DESTINATION_CONCURRENCY: z.coerce.number().int().min(1).default(10),
  })
export type WorkerEnv = z.infer<typeof WorkerEnv>

export const loadWorkerEnv = (): WorkerEnv => loadEnv(WorkerEnv)
