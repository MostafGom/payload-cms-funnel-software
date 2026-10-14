import type { Logger } from '@fp/platform/logger'
import { every, withAdvisoryLock } from '../../lib/locks.ts'
import {
  applyRetention,
  checkDsarDeadlines,
  maintainPartitions,
  rebuildRollups,
  reconcile,
  runSegments,
  runSequences,
  sweepDeliveries,
  type SchedulerDeps,
} from './jobs.ts'

/** Each job runs under its own advisory lock, so any number of scheduler replicas is safe. */
const JOBS: {
  name: string
  key: number
  everyMs: number
  run: (d: SchedulerDeps) => Promise<unknown>
}[] = [
  { name: 'partitions', key: 727_101, everyMs: 3_600_000, run: maintainPartitions },
  { name: 'sequences', key: 727_102, everyMs: 30_000, run: runSequences },
  { name: 'segments', key: 727_103, everyMs: 60_000, run: runSegments },
  { name: 'sweeper', key: 727_104, everyMs: 60_000, run: sweepDeliveries },
  { name: 'rollups', key: 727_105, everyMs: 15 * 60_000, run: rebuildRollups },
  { name: 'retention', key: 727_106, everyMs: 6 * 3_600_000, run: applyRetention },
  { name: 'dsar', key: 727_107, everyMs: 3_600_000, run: checkDsarDeadlines },
  { name: 'reconcile', key: 727_108, everyMs: 6 * 3_600_000, run: reconcile },
]

export function startScheduler(
  deps: SchedulerDeps,
  logger: Logger,
  signal: AbortSignal,
): Promise<void> {
  return Promise.all(
    JOBS.map((j) =>
      every(
        j.everyMs,
        signal,
        () => withAdvisoryLock(deps.sql, j.key, () => j.run(deps)),
        (err) => logger.error({ err, job: j.name }, 'scheduled job failed'),
      ),
    ),
  ).then(() => undefined)
}
