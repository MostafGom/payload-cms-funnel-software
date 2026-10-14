import type { AdminViewServerProps } from 'payload'
import { repos } from '@fp/db'
import { cdp } from '@/lib/cdp'
import { AdminShell, cell, tableStyle } from './AdminShell'
import { ReplayButton } from './ReplayButton'

/** Destination health: success rate, latency, errors, dead letters, replay (FR-ANL-3, FR-DST-7). */
export async function DeliveriesView(props: AdminViewServerProps) {
  const { sql } = cdp()
  const health = await repos.deliveryHealth(sql, 24)
  const recent = await sql<
    {
      delivery_id: string
      created_at: string
      destination_type: string
      event_name: string
      status: string
      attempts: number
      last_status_code: number | null
      last_error: string | null
    }[]
  >`SELECT delivery_id, created_at, destination_type, event_name, status, attempts, last_status_code, last_error
    FROM cdp.destination_deliveries
    WHERE created_at >= now() - interval '7 days' AND status IN ('failed', 'dead', 'retrying')
    ORDER BY updated_at DESC LIMIT 100`
  const byDest = new Map<
    string,
    {
      type: string
      total: number
      ok: number
      p95: number | null
      statuses: Record<string, number>
    }
  >()
  for (const h of health) {
    const d = byDest.get(h.destination_id) ?? {
      type: h.destination_type,
      total: 0,
      ok: 0,
      p95: null,
      statuses: {},
    }
    d.total += h.n
    d.statuses[h.status] = h.n
    if (h.status === 'success') {
      d.ok += h.n
      d.p95 = h.p95
    }
    byDest.set(h.destination_id, d)
  }
  const isAdmin = (props.initPageResult.req.user as { roles?: string[] } | null)?.roles?.some(
    (r) => r === 'owner' || r === 'admin' || r === 'marketer',
  )

  return (
    <AdminShell props={props} title="Destination health (24h)">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Destination</th>
            <th style={cell}>Type</th>
            <th style={cell}>Deliveries</th>
            <th style={cell}>Success</th>
            <th style={cell}>p95 latency</th>
            <th style={cell}>Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {[...byDest.entries()].map(([id, d]) => {
            const sendable =
              d.total -
              Object.entries(d.statuses)
                .filter(([s]) => s.startsWith('skipped'))
                .reduce((a, [, n]) => a + n, 0)
            return (
              <tr key={id}>
                <td style={cell}>
                  <a href={`/admin/collections/destinations/${id}`}>{id.slice(0, 8)}</a>
                </td>
                <td style={cell}>{d.type}</td>
                <td style={cell}>{d.total}</td>
                <td style={cell}>{sendable ? ((100 * d.ok) / sendable).toFixed(1) : '—'}%</td>
                <td style={cell}>{d.p95 ?? '—'} ms</td>
                <td style={cell}>
                  {Object.entries(d.statuses)
                    .map(([s, n]) => `${s}: ${n}`)
                    .join(' · ')}
                </td>
              </tr>
            )
          })}
          {byDest.size === 0 ? (
            <tr>
              <td style={cell} colSpan={6}>
                No deliveries in the last 24 hours.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {isAdmin ? (
        <ReplayButton
          label="Replay all failed/dead (7 days)"
          body={{ statuses: ['failed', 'dead'], days: 7 }}
        />
      ) : null}
      <h2>Recent problems</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>When</th>
            <th style={cell}>Type</th>
            <th style={cell}>Event</th>
            <th style={cell}>Status</th>
            <th style={cell}>Attempts</th>
            <th style={cell}>Error</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.delivery_id}>
              <td style={cell}>
                {new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}
              </td>
              <td style={cell}>{r.destination_type}</td>
              <td style={cell}>{r.event_name}</td>
              <td style={cell}>{r.status}</td>
              <td style={cell}>{r.attempts}</td>
              <td style={cell}>
                <code>
                  {r.last_status_code ?? ''} {r.last_error?.slice(0, 160)}
                </code>
              </td>
              <td style={cell}>
                {isAdmin ? (
                  <ReplayButton label="Replay" body={{ deliveryIds: [r.delivery_id] }} />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  )
}
