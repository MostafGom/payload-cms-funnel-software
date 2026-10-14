import { Queue, type ConnectionOptions } from 'bullmq'

/** BullMQ queues (ADR-0006). One queue per destination so each gets its own rate limit. */
export const QUEUE_PREFIX = 'fp'
export const destinationQueueName = (destinationId: string) => `dest-${destinationId}`
export const EMAIL_QUEUE = 'email'

export interface DeliveryJob {
  deliveryId: string
  createdAt: string
  destinationId: string
  eventId: string
  /** full IP encrypted (ADR-0012): only ever in transit */
  ipEnc?: string
  userAgent?: string | null
  cookies?: Record<string, string>
  traceparent?: string
}

export interface EmailJob {
  kind: 'transactional' | 'double_opt_in' | 'sequence'
  contactId: string
  templateId?: string
  vars?: Record<string, string>
  enrollmentId?: string
  sequenceId?: string
  stepIndex?: number
  /** idempotency: one message row per id */
  messageId: string
}

export function createQueues(connection: ConnectionOptions) {
  const queues = new Map<string, Queue>()
  const get = (name: string) => {
    let q = queues.get(name)
    if (!q) {
      q = new Queue(name, {
        connection,
        prefix: QUEUE_PREFIX,
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 10_000 },
          removeOnFail: { age: 7 * 86_400 },
        },
      })
      queues.set(name, q)
    }
    return q
  }
  return {
    delivery: (destinationId: string) => get(destinationQueueName(destinationId)),
    email: () => get(EMAIL_QUEUE),
    async enqueueDeliveries(jobs: DeliveryJob[]) {
      const byDest = new Map<string, DeliveryJob[]>()
      for (const j of jobs) byDest.set(j.destinationId, [...(byDest.get(j.destinationId) ?? []), j])
      for (const [dest, js] of byDest)
        await get(destinationQueueName(dest)).addBulk(
          js.map((data) => ({
            name: 'deliver',
            data,
            opts: { jobId: data.deliveryId, attempts: 1 },
          })),
        )
    },
    async enqueueEmail(job: EmailJob, delayMs = 0) {
      await get(EMAIL_QUEUE).add('send', job, {
        jobId: job.messageId,
        delay: delayMs,
        attempts: 8,
        backoff: { type: 'exponential', delay: 30_000 },
      })
    },
    async close() {
      await Promise.allSettled([...queues.values()].map((q) => q.close()))
    },
  }
}
export type Queues = ReturnType<typeof createQueues>
