// Phase 3 exit criterion: a segment over 1M contacts recomputes in < 60 s (FR-CRM-6).
//   node --env-file=../../.env perf/segments.ts [contacts=1000000]
import { createDb, migrate } from '@fp/db'
import { createLogger } from '@fp/platform/logger'
import { createCmsStub, createTestDatabase, createTestRedis } from '@fp/testing'
import { createSnapshotCache } from '../src/lib/snapshots.ts'
import { recomputeSegment } from '../src/roles/segments/compute.ts'

const N = Number(process.argv[2] ?? 1_000_000)
const t = await createTestDatabase()
const tr = await createTestRedis()
const log = createLogger({ service: 'perf' })
try {
  await migrate(t.sql)
  await createCmsStub(t.sql)
  let t0 = Date.now()
  await t.sql.unsafe(`
    INSERT INTO cms.contacts (email, country, marketing_status, lifecycle_stage, acquisition_utm_source, custom_fields)
    SELECT 'c' || g || '@example.org', (ARRAY['US','DE','GB','FR','BR'])[1 + g % 5],
      (ARRAY['subscribed','none','unconfirmed'])[1 + g % 3]::cms.enum_contacts_marketing_status,
      (ARRAY['lead','customer','subscriber'])[1 + g % 3]::cms.enum_contacts_lifecycle_stage,
      (ARRAY['meta','tiktok','google'])[1 + g % 3], jsonb_build_object('budget', g % 5000)
    FROM generate_series(1, ${N}) g`)
  await t.sql`ANALYZE cms.contacts`
  log.info({ contacts: N, ms: Date.now() - t0 }, 'seeded')
  const { sql } = createDb(t.url, { max: 2 })
  const seg = {
    id: 'perf',
    name: 'US/GB subscribed leads from Meta with budget > 1000',
    recomputeMinutes: 5,
    rules: {
      type: 'group' as const,
      op: 'and' as const,
      conditions: [
        {
          type: 'attribute' as const,
          field: 'marketingStatus' as const,
          operator: 'eq' as const,
          value: 'subscribed',
        },
        {
          type: 'attribute' as const,
          field: 'country' as const,
          operator: 'in' as const,
          value: ['US', 'GB'],
        },
        {
          type: 'attribute' as const,
          field: 'acquisition.utmSource' as const,
          operator: 'eq' as const,
          value: 'meta',
        },
        { type: 'custom_field' as const, key: 'budget', operator: 'gt' as const, value: 1000 },
      ],
    },
  }
  const deps = { sql, redis: tr.redis, snapshots: createSnapshotCache(sql) }
  t0 = Date.now()
  const first = await recomputeSegment(deps, seg, { emitEvents: false })
  const firstMs = Date.now() - t0
  await t.sql`UPDATE cms.contacts SET marketing_status = 'unsubscribed' WHERE email LIKE 'c1%@example.org'`
  t0 = Date.now()
  const second = await recomputeSegment(deps, seg, { emitEvents: false })
  const secondMs = Date.now() - t0
  console.log(
    JSON.stringify({
      contacts: N,
      first: { ...first, ms: firstMs },
      incremental: { ...second, ms: secondMs },
      ok: firstMs < 60_000 && secondMs < 60_000,
    }),
  )
  await sql.end()
} finally {
  await t.drop()
  await tr.close()
}
