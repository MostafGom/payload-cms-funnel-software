import type { z } from 'zod'
import {
  DestinationSnapshot,
  EmailSequenceSnapshot,
  EmailSettingsSnapshot,
  EmailTemplateSnapshot,
  ExperimentSnapshot,
  FormSnapshot,
  FunnelSnapshot,
  SegmentSnapshot,
  type SnapshotKind,
} from '@fp/contracts'
import { repos, type Sql } from '@fp/db'

const SCHEMAS = {
  form: FormSnapshot,
  funnel: FunnelSnapshot,
  destination: DestinationSnapshot,
  email_template: EmailTemplateSnapshot,
  email_sequence: EmailSequenceSnapshot,
  email_settings: EmailSettingsSnapshot,
  segment: SegmentSnapshot,
  experiment: ExperimentSnapshot,
} satisfies Partial<Record<SnapshotKind, z.ZodType>>
type Kinds = keyof typeof SCHEMAS
type Of<K extends Kinds> = z.infer<(typeof SCHEMAS)[K]>

/**
 * Published CMS config for workers (ADR-0025), cached per kind with a short TTL. Invalid rows are
 * skipped (and logged by the caller) rather than crashing the pipeline.
 */
export function createSnapshotCache(sql: Sql, ttlMs = 10_000, now = () => Date.now()) {
  const cache = new Map<Kinds, { at: number; items: Map<string, unknown> }>()
  async function load<K extends Kinds>(kind: K): Promise<Map<string, Of<K>>> {
    const hit = cache.get(kind)
    if (hit && now() - hit.at < ttlMs) return hit.items as Map<string, Of<K>>
    const rows = await repos.listSnapshots(sql, kind)
    const items = new Map<string, Of<K>>()
    for (const r of rows) {
      const p = SCHEMAS[kind].safeParse(r.data)
      if (p.success) items.set(r.id, p.data as Of<K>)
    }
    cache.set(kind, { at: now(), items })
    return items
  }
  return {
    list: async <K extends Kinds>(kind: K): Promise<Of<K>[]> => [...(await load(kind)).values()],
    get: async <K extends Kinds>(kind: K, id: string): Promise<Of<K> | undefined> =>
      (await load(kind)).get(id),
    invalidate: () => cache.clear(),
  }
}
export type SnapshotCache = ReturnType<typeof createSnapshotCache>
