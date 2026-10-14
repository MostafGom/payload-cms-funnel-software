import type { AdminViewServerProps } from 'payload'
import { dailyTotals, funnelConversion, sourceBreakdown } from '@/lib/analytics'
import { cdp } from '@/lib/cdp'
import { AdminShell, cell, tableStyle } from './AdminShell'

const DIMENSIONS = ['channel', 'utm_source', 'utm_campaign', 'utm_medium', 'click_id'] as const

/** Dashboards v1: funnel step conversion (per variant) and source breakdown (FR-ANL-1/2). */
export async function AnalyticsView(props: AdminViewServerProps) {
  const sp = (props.searchParams ?? {}) as Record<string, string | undefined>
  const days = Math.min(Math.max(Number(sp.days ?? 30) || 30, 1), 400)
  const to = new Date()
  const from = new Date(to.getTime() - days * 86_400_000)
  const range = { from: from.toISOString(), to: to.toISOString() }
  const by = (DIMENSIONS as readonly string[]).includes(sp.by ?? '')
    ? (sp.by as (typeof DIMENSIONS)[number])
    : 'channel'
  const { payload } = props.initPageResult.req
  const funnels = await payload.find({
    collection: 'funnels',
    limit: 50,
    depth: 0,
    req: props.initPageResult.req,
  })
  const { sql } = cdp()
  const [daily, sources, perFunnel] = await Promise.all([
    dailyTotals(sql, range),
    sourceBreakdown(sql, range, by),
    Promise.all(
      funnels.docs.map(async (f) => ({
        funnel: f,
        rows: await funnelConversion(sql, String(f.id), range),
      })),
    ),
  ])
  const totals = daily.reduce((a, d) => ({ s: a.s + d.sessions, c: a.c + d.conversions }), {
    s: 0,
    c: 0,
  })

  return (
    <AdminShell props={props} title="Funnel analytics">
      <form style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <label>
          Window{' '}
          <select name="days" defaultValue={String(days)}>
            {[1, 7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <label>
          Breakdown{' '}
          <select name="by" defaultValue={by}>
            {DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>
      <p>
        <strong>{totals.s}</strong> sessions · <strong>{totals.c}</strong> sign-ups ·{' '}
        <strong>{totals.s ? ((100 * totals.c) / totals.s).toFixed(2) : '0.00'}%</strong> conversion
      </p>

      {perFunnel.map(({ funnel, rows }) => (
        <section key={funnel.id}>
          <h2>{funnel.name}</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={cell}>Variant</th>
                <th style={cell}>Visitors</th>
                {funnel.steps.map((s) => (
                  <th key={s.stepId} style={cell}>
                    {s.name}
                  </th>
                ))}
                <th style={cell}>Converted</th>
                <th style={cell}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td style={cell} colSpan={funnel.steps.length + 4}>
                    No traffic in this window.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.variant_key}>
                    <td style={cell}>{r.variant_key || '—'}</td>
                    <td style={cell}>{r.visitors}</td>
                    {funnel.steps.map((s) => {
                      const n = r.reached[s.stepId] ?? 0
                      return (
                        <td key={s.stepId} style={cell}>
                          {n}{' '}
                          <small style={{ opacity: 0.6 }}>
                            ({r.visitors ? Math.round((100 * n) / r.visitors) : 0}%)
                          </small>
                        </td>
                      )
                    })}
                    <td style={cell}>{r.converted}</td>
                    <td style={cell}>
                      {r.visitors ? ((100 * r.converted) / r.visitors).toFixed(2) : '0.00'}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ))}

      <h2>Sources by {by}</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>{by}</th>
            <th style={cell}>Sessions</th>
            <th style={cell}>Sign-ups</th>
            <th style={cell}>Rate</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.key}>
              <td style={cell}>{s.key}</td>
              <td style={cell}>{s.sessions}</td>
              <td style={cell}>{s.conversions}</td>
              <td style={cell}>{s.rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Daily</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Day</th>
            <th style={cell}>Sessions</th>
            <th style={cell}>Sign-ups</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.day}>
              <td style={cell}>{d.day}</td>
              <td style={cell}>{d.sessions}</td>
              <td style={cell}>{d.conversions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  )
}
