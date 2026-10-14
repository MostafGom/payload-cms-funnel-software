import { DelayedError, Worker, type ConnectionOptions, type Job } from 'bullmq'
import type { Meter, Tracer } from '@fp/platform/otel'
import { contextFromTraceparent, SpanKind, withSpan } from '@fp/platform/otel'
import { destinationQueueName, QUEUE_PREFIX, type DeliveryJob } from '../../lib/queues.ts'
import { deliver, type DeliverDeps } from './deliver.ts'

/**
 * Keeps one BullMQ worker per enabled destination, each with its own rate limit (FR-DST-7),
 * reconciling against config snapshots every few seconds (destinations added/removed/changed).
 */
export function startDestinationWorkers(
  deps: DeliverDeps & {
    connection: ConnectionOptions
    tracer: Tracer
    meter: Meter
    concurrency: number
  },
  signal: AbortSignal,
): Promise<void> {
  const workers = new Map<string, { worker: Worker; rate: number }>()
  const outcomes = deps.meter.createCounter('fp_destination_deliveries_total', {
    description: 'Delivery attempts by outcome',
  })
  const latency = deps.meter.createHistogram('fp_destination_latency_ms', {
    description: 'Destination HTTP latency',
    unit: 'ms',
  })

  const processor = async (job: Job<DeliveryJob>, token?: string) => {
    const attempt = (job.data as DeliveryJob & { attempt?: number }).attempt ?? 1
    const outcome = await withSpan(
      deps.tracer,
      'destination.deliver',
      {
        kind: SpanKind.PRODUCER,
        parent: contextFromTraceparent(job.data.traceparent),
        attributes: { 'fp.destination_id': job.data.destinationId, 'fp.attempt': attempt },
      },
      async (span) => {
        const o = await deliver(deps, job.data, attempt)
        span.setAttribute('fp.outcome', o.status)
        return o
      },
    )
    outcomes.add(1, { destination: job.data.destinationId, outcome: outcome.status })
    if (outcome.status === 'success')
      latency.record(outcome.latencyMs, { destination: job.data.destinationId })
    if (outcome.status === 'retry') {
      // Per-attempt delay (exponential + jitter, Retry-After aware) instead of BullMQ's fixed backoff.
      await job.updateData({ ...job.data, attempt: attempt + 1 } as DeliveryJob)
      await job.moveToDelayed(Date.now() + outcome.delayMs, token)
      throw new DelayedError()
    }
  }

  const reconcile = async () => {
    const dests = (await deps.snapshots.list('destination')).filter((d) => d.enabled)
    const wanted = new Map(dests.map((d) => [d.id, d.rateLimitPerSecond]))
    for (const [id, w] of workers) {
      if (wanted.get(id) !== w.rate) {
        await w.worker.close()
        workers.delete(id)
      }
    }
    for (const [id, rate] of wanted) {
      if (workers.has(id)) continue
      const worker = new Worker(destinationQueueName(id), processor, {
        connection: deps.connection,
        prefix: QUEUE_PREFIX,
        concurrency: deps.concurrency,
        limiter: { max: rate, duration: 1000 },
      })
      worker.on('failed', (job, err) =>
        deps.logger.error({ err, deliveryId: job?.data.deliveryId }, 'delivery job crashed'),
      )
      workers.set(id, { worker, rate })
      deps.logger.info({ destinationId: id, rate }, 'destination worker started')
    }
  }

  return new Promise((resolve) => {
    const tick = () =>
      reconcile().catch((err) => deps.logger.error({ err }, 'destination reconcile failed'))
    void tick()
    const t = setInterval(tick, 10_000)
    signal.addEventListener('abort', () => {
      clearInterval(t)
      void Promise.allSettled([...workers.values()].map((w) => w.worker.close())).then(() =>
        resolve(),
      )
    })
  })
}
