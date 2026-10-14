import type { EmailTemplateSnapshot } from '@fp/contracts'

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!)

const VAR = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g

/** `{{name}}` substitution; values are HTML-escaped in HTML parts, unknown variables become ''. */
export function interpolate(template: string, vars: Record<string, string>, html: boolean): string {
  return template.replace(VAR, (_, k: string) => {
    const v = vars[k] ?? ''
    return html ? escapeHtml(v) : v
  })
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
  headers: Record<string, string>
}

/**
 * Renders a template with the compliance footer and RFC 8058 one-click unsubscribe headers
 * (FR-EML-4). Transactional DOI mail gets no unsubscribe (the person has not subscribed yet).
 */
export function renderEmail(
  t: EmailTemplateSnapshot,
  vars: Record<string, string>,
  opts: { unsubscribeUrl?: string; postalAddress?: string; marketing: boolean },
): RenderedEmail {
  const subject = interpolate(t.subject, vars, false)
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 250)
  const pre = t.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(interpolate(t.preheader, vars, false))}</div>`
    : ''
  const unsub = opts.marketing && opts.unsubscribeUrl
  const footerHtml = [
    opts.postalAddress ? `<p>${escapeHtml(opts.postalAddress)}</p>` : '',
    unsub ? `<p><a href="${escapeHtml(opts.unsubscribeUrl!)}">Unsubscribe</a></p>` : '',
  ].join('')
  const footerText = [opts.postalAddress ?? '', unsub ? `Unsubscribe: ${opts.unsubscribeUrl}` : '']
    .filter(Boolean)
    .join('\n')
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">${pre}${interpolate(
    t.html,
    vars,
    true,
  )}<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/><div style="font-size:12px;color:#666">${footerHtml}</div></body></html>`
  const text = `${interpolate(t.text, vars, false)}\n\n--\n${footerText}`.trim()
  const headers: Record<string, string> = unsub
    ? {
        'List-Unsubscribe': `<${opts.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      }
    : {}
  return { subject, html, text, headers }
}
