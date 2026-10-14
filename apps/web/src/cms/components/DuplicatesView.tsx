import type { AdminViewServerProps } from 'payload'
import { cdp } from '@/lib/cdp'
import { AdminShell, cell, tableStyle } from './AdminShell'
import { MergeButtons } from './MergeButtons'

/** Possible duplicates queue (FR-CRM-7): never auto-merged; a person decides. */
export async function DuplicatesView(props: AdminViewServerProps) {
  const rows = await cdp().sql<
    { contact_a: string; contact_b: string; reason: string; score: number; created_at: string }[]
  >`
    SELECT contact_a, contact_b, reason, score, created_at FROM cdp.duplicate_candidates
    WHERE status = 'open' ORDER BY score DESC, created_at LIMIT 200`
  const ids = [...new Set(rows.flatMap((r) => [r.contact_a, r.contact_b]))]
  const contacts = ids.length
    ? await props.initPageResult.req.payload.find({
        collection: 'contacts',
        where: { id: { in: ids } },
        limit: ids.length,
        depth: 0,
        req: props.initPageResult.req,
      })
    : { docs: [] }
  const byId = new Map(contacts.docs.map((c) => [String(c.id), c]))
  const label = (id: string) => {
    const c = byId.get(id)
    return c
      ? `${c.email ?? '(no email)'} · ${c.phone ?? ''} · ${[c.firstName, c.lastName].filter(Boolean).join(' ')}`
      : id
  }
  return (
    <AdminShell props={props} title="Possible duplicates">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Contact A</th>
            <th style={cell}>Contact B</th>
            <th style={cell}>Reason</th>
            <th style={cell}>Score</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.contact_a}${r.contact_b}`}>
              <td style={cell}>
                <a href={`/admin/collections/contacts/${r.contact_a}`}>{label(r.contact_a)}</a>
              </td>
              <td style={cell}>
                <a href={`/admin/collections/contacts/${r.contact_b}`}>{label(r.contact_b)}</a>
              </td>
              <td style={cell}>{r.reason}</td>
              <td style={cell}>{r.score.toFixed(2)}</td>
              <td style={cell}>
                <MergeButtons a={r.contact_a} b={r.contact_b} />
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td style={cell} colSpan={5}>
                Nothing to review.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </AdminShell>
  )
}
