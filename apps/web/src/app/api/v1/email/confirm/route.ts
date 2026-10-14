import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyLinkToken } from '@fp/email'
import { repos } from '@fp/db'
import { uuidv7 } from '@fp/platform/ids'
import { cdp } from '@/lib/cdp'
import { htmlPage } from '@/lib/email-links'
import { emailLinkSecret } from '@/lib/env'

/** Double opt-in confirmation (FR-EML-1): marks the contact subscribed and logs consent. */
export async function GET(request: Request) {
  const v = verifyLinkToken(
    emailLinkSecret(),
    'confirm',
    new URL(request.url).searchParams.get('t'),
  )
  if (!v.ok)
    return htmlPage(
      'Link expired',
      '<p>This confirmation link is invalid or has expired. Please sign up again.</p>',
      400,
    )
  const payload = await getPayload({ config })
  const contact = await payload
    .findByID({ collection: 'contacts', id: v.contactId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!contact || contact.status !== 'active')
    return htmlPage('Not found', '<p>We could not find your subscription.</p>', 404)
  if (contact.marketingStatus !== 'subscribed') {
    await payload.update({
      collection: 'contacts',
      id: contact.id,
      overrideAccess: true,
      data: { marketingStatus: 'subscribed', optInConfirmedAt: new Date().toISOString() },
      context: { actor: 'double_opt_in' },
    })
    const { sql } = cdp()
    if (contact.emailHash) await repos.unsuppress(sql, 1, contact.emailHash)
    await repos.insertConsentRecords(sql, [
      {
        id: uuidv7(),
        workspaceId: 1,
        recordedAt: new Date().toISOString(),
        anonymousId: null,
        contactId: String(contact.id),
        sessionId: null,
        region: 'XX',
        regime: 'opt_in',
        policyVersion: null,
        bannerVersion: null,
        analytics: false,
        marketing: true,
        gpc: false,
        source: 'double_opt_in',
        ipTrunc: null,
        userAgent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
      },
    ])
  }
  return htmlPage('You are subscribed', '<p>Thanks for confirming your email address.</p>')
}
