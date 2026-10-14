import { createDb } from './client.ts'
import { migrate } from './migrator.ts'
import { ensureDailyPartitions, PARTITIONED_DAILY } from './partitions.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
const { sql } = createDb(url, { max: 1, appName: 'fp-migrator' })

try {
  const cmd = process.argv[2]
  if (cmd === 'migrate') {
    const r = await migrate(sql)
    console.log(
      `cdp migrations: applied ${r.applied.length} (${r.applied.join(', ') || '-'}), up-to-date ${r.skipped.length}`,
    )
    for (const t of PARTITIONED_DAILY)
      console.log(`partitions ${t}: created ${(await ensureDailyPartitions(sql, t)).length}`)
  } else if (cmd === 'partitions') {
    for (const t of PARTITIONED_DAILY)
      console.log(`partitions ${t}: created ${(await ensureDailyPartitions(sql, t)).length}`)
  } else {
    console.error('usage: cli.ts <migrate|partitions>')
    process.exitCode = 1
  }
} finally {
  await sql.end()
}
