import { Gutter } from '@payloadcms/ui'
import type { DocumentViewServerProps } from 'payload'
import { contactTimeline } from '@/lib/analytics'
import { cdp } from '@/lib/cdp'
import { cell, tableStyle } from './AdminShell'

/** Unified per-contact timeline: events, submissions, emails, consent, deliveries (FR-CRM-5). */
export async function ContactTimeline(props: DocumentViewServerProps) {
  const id = props.initPageResult.docID ?? (props.doc as { id?: string } | undefined)?.id
  if (!id) return null
  const { payload } = props.initPageResult.req
  const [items, notes, submissions] = await Promise.all([
    contactTimeline(cdp().sql, String(id)),
    payload.find({
      collection: 'notes',
      where: { contact: { equals: id } },
      limit: 50,
      depth: 0,
      req: props.initPageResult.req,
    }),
    payload.find({
      collection: 'form-submissions',
      where: { contact: { equals: id } },
      limit: 50,
      depth: 1,
      req: props.initPageResult.req,
    }),
  ])
  const all = [
    ...items.map((i) => ({
      at: new Date(i.at).toISOString(),
      kind: i.kind,
      title: i.title,
      detail: i.detail,
    })),
    ...notes.docs.map((n) => ({
      at: n.createdAt,
      kind: 'note',
      title: n.body.slice(0, 120),
      detail: null,
    })),
    ...submissions.docs.map((s) => ({
      at: s.createdAt,
      kind: 'submission',
      title: typeof s.form === 'object' ? s.form.name : 'form',
      detail: { utm_source: s.utmSource, page: s.pageUrl } as Record<string, unknown>,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <Gutter>
      <h2 style={{ margin: '24px 0' }}>Timeline</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>When</th>
            <th style={cell}>Type</th>
            <th style={cell}>What</th>
            <th style={cell}>Details</th>
          </tr>
        </thead>
        <tbody>
          {all.map((i, n) => (
            <tr key={n}>
              <td style={cell}>{i.at.replace('T', ' ').slice(0, 19)}</td>
              <td style={cell}>{i.kind}</td>
              <td style={cell}>{i.title}</td>
              <td style={cell}>
                <code>
                  {i.detail
                    ? Object.entries(i.detail)
                        .filter(([, v]) => v != null)
                        .map(([k, v]) => `${k}=${String(v)}`)
                        .join(' ')
                    : ''}
                </code>
              </td>
            </tr>
          ))}
          {all.length === 0 ? (
            <tr>
              <td style={cell} colSpan={4}>
                No activity yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Gutter>
  )
}
