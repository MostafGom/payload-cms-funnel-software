import { getPayload } from 'payload'
import config from '@payload-config'
import { repos } from '@fp/db'
import { verifyLinkToken } from '@fp/email'
import { cdp } from '@/lib/cdp'
import { htmlPage } from '@/lib/email-links'
import { emailLinkSecret } from '@/lib/env'

/**
 * Unsubscribe (FR-EML-4). GET shows a confirmation page (link scanners must not unsubscribe
 * people); POST performs it, and is also the RFC 8058 one-click endpoint mail clients call.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t') ?? ''
  const v = verifyLinkToken(emailLinkSecret(), 'unsub', token)
  if (!v.ok)
    return htmlPage(
      'Link invalid',
      '<p>This unsubscribe link is invalid. Reply to any email and we will remove you.</p>',
      400,
    )
  return htmlPage(
    'Unsubscribe',
    `<form method="post"><input type="hidden" name="t" value="${token.replace(/[^\w.-]/g, '')}"><p>Stop receiving marketing emails from us?</p><button type="submit">Unsubscribe</button></form>`,
  )
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  let token = url.searchParams.get('t')
  if (!token) {
    const form = await request.formData().catch(() => null)
    token = (form?.get('t') as string | null) ?? null
  }
  const v = verifyLinkToken(emailLinkSecret(), 'unsub', token)
  if (!v.ok) return htmlPage('Link invalid', '<p>This unsubscribe link is invalid.</p>', 400)
  const payload = await getPayload({ config })
  const contact = await payload
    .findByID({ collection: 'contacts', id: v.contactId, depth: 0, overrideAccess: true })
    .catch(() => null)
  const { sql } = cdp()
  if (contact) {
    if (contact.emailHash)
      await repos.suppress(sql, {
        workspaceId: 1,
        emailHash: contact.emailHash,
        reason: 'unsubscribe',
      })
    await repos.exitEnrollments(sql, String(contact.id), 'unsubscribed')
    if (contact.marketingStatus !== 'unsubscribed')
      await payload.update({
        collection: 'contacts',
        id: contact.id,
        overrideAccess: true,
        data: { marketingStatus: 'unsubscribed' },
        context: { actor: 'unsubscribe' },
      })
  }
  return htmlPage('Unsubscribed', '<p>You will no longer receive marketing emails from us.</p>')
}
