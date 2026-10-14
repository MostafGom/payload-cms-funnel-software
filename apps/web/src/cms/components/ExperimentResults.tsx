import type { UIFieldServerProps } from 'payload'
import { compareArms, pickWinner, sampleRatioMismatch } from '@fp/experiments'
import { cdp } from '@/lib/cdp'
import { cell, tableStyle } from './AdminShell'
import { PromoteWinner } from './PromoteWinner'

/** Live results per variant: rate, lift, p-value, SRM (FR-FUN-5). */
export async function ExperimentResults(props: UIFieldServerProps) {
  const data = props.data as
    | { id?: string; variants?: { key: string; weight: number }[]; goalEvent?: string }
    | undefined
  if (!data?.id) return <p>Save the experiment to see results.</p>
  const rows = await cdp().sql<{ variant_key: string; visitors: number; conversions: number }[]>`
    SELECT variant_key, count(*)::int AS visitors, count(converted_at)::int AS conversions
    FROM cdp.experiment_assignments WHERE experiment_id = ${String(data.id)} AND exposed_at IS NOT NULL
    GROUP BY variant_key`
  const byKey = new Map(rows.map((r) => [r.variant_key, r]))
  const arms = (data.variants ?? []).map((v) => ({
    key: v.key,
    weight: v.weight,
    visitors: byKey.get(v.key)?.visitors ?? 0,
    conversions: byKey.get(v.key)?.conversions ?? 0,
  }))
  const results = compareArms(arms)
  const srm = sampleRatioMismatch(arms)
  const winner = pickWinner(results)
  const pct = (x: number | null) => (x === null ? '—' : `${(100 * x).toFixed(2)}%`)
  return (
    <div style={{ margin: '24px 0' }}>
      <h3>Results ({data.goalEvent ?? 'form_submitted'})</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Variant</th>
            <th style={cell}>Exposed</th>
            <th style={cell}>Converted</th>
            <th style={cell}>Rate</th>
            <th style={cell}>Lift</th>
            <th style={cell}>p-value</th>
            <th style={cell}>95% CI (abs)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.key}>
              <td style={cell}>
                {r.key}
                {i === 0 ? ' (control)' : ''}
                {r.significant ? ' ✓' : ''}
              </td>
              <td style={cell}>{r.visitors}</td>
              <td style={cell}>{r.conversions}</td>
              <td style={cell}>{pct(r.rate)}</td>
              <td style={cell}>{pct(r.lift)}</td>
              <td style={cell}>{r.pValue === null ? '—' : r.pValue.toFixed(4)}</td>
              <td style={cell}>{r.ci95 ? `${pct(r.ci95[0])} … ${pct(r.ci95[1])}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {srm.mismatch ? (
        <p style={{ color: 'var(--theme-error-500)' }}>
          Sample ratio mismatch (p={srm.pValue.toExponential(2)}): check assignment before trusting
          results.
        </p>
      ) : null}
      {winner ? (
        <PromoteWinner experimentId={String(data.id)} variantKey={winner} />
      ) : (
        <p>No significant winner yet.</p>
      )}
    </div>
  )
}
