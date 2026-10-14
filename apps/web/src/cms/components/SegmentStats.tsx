import type { UIFieldServerProps } from 'payload'
import { cdp } from '@/lib/cdp'

/** Live member count and recent movement for a segment (FR-CRM-6). */
export async function SegmentStats(props: UIFieldServerProps) {
  const id = (props.data as { id?: string } | undefined)?.id
  if (!id) return null
  const [r] = await cdp().sql<{ members: number; entered_7d: number }[]>`
    SELECT count(*)::int AS members,
      count(*) FILTER (WHERE entered_at > now() - interval '7 days')::int AS entered_7d
    FROM cdp.segment_memberships WHERE segment_id = ${String(id)}`
  return (
    <div style={{ margin: '16px 0' }}>
      <p style={{ margin: 0, opacity: 0.7 }}>Members</p>
      <p style={{ fontSize: 28, margin: '4px 0' }}>{r?.members ?? 0}</p>
      <p style={{ margin: 0, opacity: 0.7 }}>+{r?.entered_7d ?? 0} in the last 7 days</p>
    </div>
  )
}
