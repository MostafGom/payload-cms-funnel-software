import { expect, test } from '@playwright/test'
import { ADMIN_URL, adminToken, sql, uniqueEmail } from './helpers'

/**
 * Phase 2 exit criterion (FR-CNS-4): after an erasure request is executed, no PII for the person
 * remains anywhere (CMS rows, cdp events/read models, logs keep only hashes and pseudonymised
 * consent proof).
 */
test('DSAR erasure leaves zero PII', async ({ page, request, context }) => {
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'US-CA' })
  const email = uniqueEmail('erase')
  await page.goto('/?utm_source=meta&fbclid=ERASE')
  await page.waitForFunction(() => !!(window as unknown as { fp?: unknown }).fp)
  await page.getByRole('textbox', { name: /^First name/ }).fill('Erin')
  await page.getByRole('textbox', { name: /^Email/ }).fill(email)
  await page.waitForTimeout(1200)
  await Promise.all([
    page.waitForURL(/thank-you/),
    page.getByRole('button', { name: 'Send me the guide' }).click(),
  ])

  const [contact] = await sql<
    { id: string; email_hash: string }[]
  >`SELECT id, email_hash FROM cms.contacts WHERE email = ${email}`
  expect(contact).toBeTruthy()
  // Wait until the pipeline stored the server conversion for this contact.
  await expect
    .poll(
      async () => (await sql`SELECT 1 FROM cdp.events WHERE contact_id = ${contact!.id}`).count,
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0)

  const token = await adminToken(request)
  const headers = { authorization: `JWT ${token}`, origin: ADMIN_URL }
  const created = await request.post(`${ADMIN_URL}/cms/api/dsar-requests`, {
    headers,
    data: {
      type: 'delete',
      regime: 'gdpr',
      subjectEmail: email,
      status: 'verified',
      verificationMethod: 'e2e',
    },
  })
  expect(created.ok()).toBeTruthy()
  const { doc } = (await created.json()) as { doc: { id: string } }
  const exec = await request.post(`${ADMIN_URL}/cms/api/dsar-requests/${doc.id}/execute`, {
    headers,
  })
  expect(exec.ok(), await exec.text()).toBeTruthy()

  // cdp purge happens asynchronously via the outbox.
  await expect
    .poll(
      async () =>
        (await sql`SELECT 1 FROM cdp.erasure_tombstones WHERE contact_id = ${contact!.id}`).count,
      { timeout: 30_000 },
    )
    .toBe(1)

  const leftovers = await sql<{ source: string; n: number }[]>`
    SELECT 'cms.contacts' AS source, count(*)::int AS n FROM cms.contacts WHERE id = ${contact!.id} OR email = ${email}
    UNION ALL SELECT 'cms.form_submissions', count(*)::int FROM cms.form_submissions WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cms.form_submissions.data', count(*)::int FROM cms.form_submissions WHERE data::text ILIKE ${'%' + email + '%'}
    UNION ALL SELECT 'cms.dsar_requests', count(*)::int FROM cms.dsar_requests WHERE subject_email = ${email}
    UNION ALL SELECT 'cdp.events', count(*)::int FROM cdp.events WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.sessions', count(*)::int FROM cdp.sessions WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.identity_links', count(*)::int FROM cdp.identity_links WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.contact_identifiers', count(*)::int FROM cdp.contact_identifiers WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.email_messages', count(*)::int FROM cdp.email_messages WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.email_enrollments', count(*)::int FROM cdp.email_enrollments WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.consent_records', count(*)::int FROM cdp.consent_records WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.destination_deliveries', count(*)::int FROM cdp.destination_deliveries WHERE contact_id = ${contact!.id}
    UNION ALL SELECT 'cdp.outbox', count(*)::int FROM cdp.outbox WHERE payload::text ILIKE ${'%' + email + '%'}`
  for (const l of leftovers) expect(l.n, l.source).toBe(0)
  // Hashes only: suppression keeps the person from being emailed again.
  const [s] =
    await sql`SELECT reason FROM cdp.email_suppressions WHERE email_hash = ${contact!.email_hash}`
  expect(s?.reason).toBe('erasure')
})
