import { getPayload, type Payload } from 'payload'
import config from '../payload.config'

/**
 * Idempotent local seed (refuses to run in production):
 *  - dev admin, hosts `localhost` and `go.localhost`
 *  - a complete free sign-up funnel on go.localhost: landing (with form) -> thank-you
 *  - tags, a confirmation template, a 3-step nurture sequence
 *  - Meta, TikTok, Snap and webhook destinations in test mode, pointed at the mock server
 */
if (process.env.NODE_ENV === 'production') throw new Error('seed is for local development only')

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-locally-123'
const MOCK = process.env.MOCK_DESTINATIONS_URL ?? 'http://localhost:4010'

const payload = await getPayload({ config })

type Slug = Parameters<Payload['find']>[0]['collection']
async function upsert<T extends { id: string }>(
  collection: Slug,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  draft = false,
): Promise<T> {
  const found = (
    await payload.find({
      collection,
      where: where as never,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as unknown as T | undefined
  if (found) return found
  return (await payload.create({
    collection,
    data: data as never,
    draft,
    overrideAccess: true,
  })) as unknown as T
}

const lexical = (text: string) => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: text.split('\n\n').map((p) => ({
      type: 'paragraph',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      textFormat: 0,
      children: [
        { type: 'text', text: p, detail: 0, format: 0, mode: 'normal', style: '', version: 1 },
      ],
    })),
  },
})

await upsert(
  'users',
  { email: { equals: ADMIN_EMAIL } },
  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Dev Admin', roles: ['owner'] },
)

const primary = await upsert<{ id: string; homePage?: unknown }>(
  'domains',
  { hostname: { equals: 'localhost' } },
  { hostname: 'localhost', kind: 'primary', active: true },
)
const funnelHost = await upsert<{ id: string; homePage?: unknown }>(
  'domains',
  { hostname: { equals: 'go.localhost' } },
  { hostname: 'go.localhost', kind: 'funnel', active: true },
)

const leadTag = await upsert<{ id: string }>(
  'tags',
  { name: { equals: 'lead-magnet' } },
  { name: 'lead-magnet', color: '#2357d9' },
)
await upsert('tags', { name: { equals: 'customer' } }, { name: 'customer', color: '#16a34a' })
const newsletter = await upsert<{ id: string }>(
  'lists',
  { name: { equals: 'Newsletter' } },
  { name: 'Newsletter' },
)

const doi = await upsert<{ id: string }>(
  'email-templates',
  { name: { equals: 'Confirm your email' } },
  {
    name: 'Confirm your email',
    subject: 'Confirm your email, {{firstName}}',
    body: lexical(
      'Hi {{firstName}},\n\nPlease confirm your email to get the free guide: {{confirmUrl}}\n\nThanks!',
    ),
  },
)
const steps = await Promise.all(
  ['Welcome: here is your guide', 'Tip #1: start small', 'Last tip and an invitation'].map(
    (subject, i) =>
      upsert<{ id: string }>(
        'email-templates',
        { name: { equals: `Nurture ${i + 1}` } },
        {
          name: `Nurture ${i + 1}`,
          subject,
          body: lexical(`Hi {{firstName}},\n\n${subject}.\n\nSee you soon.`),
        },
      ),
  ),
)

const form = await upsert<{ id: string }>(
  'forms',
  { name: { equals: 'Free guide sign-up' } },
  {
    _status: 'published',
    name: 'Free guide sign-up',
    submitLabel: 'Send me the guide',
    fields: [
      {
        blockType: 'field-text',
        name: 'first_name',
        label: 'First name',
        required: true,
        mapTo: 'firstName',
        width: 'half',
      },
      {
        blockType: 'field-email',
        name: 'email',
        label: 'Email',
        required: true,
        mapTo: 'email',
        width: 'half',
      },
      {
        blockType: 'field-phone',
        name: 'phone',
        label: 'Phone (optional)',
        required: false,
        mapTo: 'phone',
        width: 'full',
      },
      {
        blockType: 'field-consent',
        name: 'marketing_optin',
        label: 'Email me tips and offers',
        required: false,
        mapTo: 'none',
        purpose: 'email_marketing',
      },
      {
        blockType: 'field-hidden',
        name: 'promo',
        label: 'Promo',
        mapTo: 'custom',
        customKey: 'promo',
        fromParam: 'promo',
      },
    ],
    onSuccess: { type: 'next_step' },
    actions: {
      tags: [leadTag.id],
      lists: [newsletter.id],
      lifecycleStage: 'lead',
      doubleOptIn: true,
      confirmationTemplate: doi.id,
    },
    spam: { minSeconds: 1, turnstile: false, blockDisposable: true },
  },
)

const thanks = await upsert<{ id: string }>(
  'pages',
  { domain: { equals: funnelHost.id }, slug: { equals: 'thank-you' } },
  {
    _status: 'published',
    title: 'Thank you',
    slug: 'thank-you',
    domain: funnelHost.id,
    layout: [
      {
        blockType: 'hero',
        headline: 'Check your inbox',
        subheadline: 'We sent you a confirmation email. Click the link to get your guide.',
      },
    ],
    seo: { noindex: true },
  },
)
const landing = await upsert<{ id: string }>(
  'pages',
  { domain: { equals: funnelHost.id }, slug: { equals: 'home' } },
  {
    _status: 'published',
    title: 'Free guide',
    slug: 'home',
    domain: funnelHost.id,
    layout: [
      {
        blockType: 'hero',
        headline: 'Get the free guide',
        subheadline: 'Seven practical steps, delivered to your inbox.',
      },
      { blockType: 'form', form: form.id, heading: 'Where should we send it?' },
      {
        blockType: 'faq',
        items: [
          { question: 'Is it really free?', answer: 'Yes. No credit card, no catch.' },
          { question: 'Can I unsubscribe?', answer: 'Any time, with one click.' },
        ],
      },
      {
        blockType: 'footer',
        text: '© Funnel Platform demo',
        links: [{ label: 'Privacy', href: '/privacy' }],
        showPrivacyChoices: true,
      },
    ],
    seo: { title: 'Free guide', description: 'Get the free guide' },
  },
)
await payload.update({
  collection: 'domains',
  id: funnelHost.id,
  data: { homePage: landing.id },
  overrideAccess: true,
})

const site = await upsert<{ id: string }>(
  'pages',
  { domain: { equals: primary.id }, slug: { equals: 'home' } },
  {
    _status: 'published',
    title: 'Funnel Platform',
    slug: 'home',
    domain: primary.id,
    layout: [
      {
        blockType: 'hero',
        headline: 'Funnel Platform',
        subheadline: 'Main site. The demo funnel lives on go.localhost.',
        cta: { label: 'Open the funnel', href: 'http://go.localhost:8080/' },
      },
    ],
  },
)
await payload.update({
  collection: 'domains',
  id: primary.id,
  data: { homePage: site.id },
  overrideAccess: true,
})

await upsert(
  'funnels',
  { name: { equals: 'Free guide funnel' } },
  {
    name: 'Free guide funnel',
    domain: funnelHost.id,
    active: true,
    steps: [
      { name: 'Landing', stepId: 'landing', type: 'landing', page: landing.id },
      { name: 'Thank you', stepId: 'thank-you', type: 'thank_you', page: thanks.id },
    ],
  },
)

await upsert(
  'email-sequences',
  { name: { equals: 'Free guide nurture' } },
  {
    name: 'Free guide nurture',
    active: true,
    trigger: { type: 'form_submitted', form: form.id },
    steps: [
      { delayAmount: 0, delayUnit: 'minutes', template: steps[0]!.id },
      { delayAmount: 2, delayUnit: 'days', template: steps[1]!.id },
      { delayAmount: 3, delayUnit: 'days', template: steps[2]!.id },
    ],
    exit: { tags: [] },
  },
)

const destinations = [
  {
    name: 'Meta (test)',
    type: 'meta',
    pixelId: '1234567890',
    accessToken: 'mock-meta-token',
    testEventCode: 'TEST12345',
  },
  {
    name: 'TikTok (test)',
    type: 'tiktok',
    pixelId: 'CTIKTOKPIXEL',
    accessToken: 'mock-tiktok-token',
    testEventCode: 'TEST67890',
  },
  { name: 'Snap (test)', type: 'snap', pixelId: 'snap-pixel-id', accessToken: 'mock-snap-token' },
  { name: 'Email tool webhook', type: 'webhook', endpointUrl: `${MOCK}/webhook` },
]
for (const d of destinations)
  await upsert(
    'destinations',
    { name: { equals: d.name } },
    { ...d, enabled: true, testMode: true, browserPixel: false },
  )

// Publish the globals once so their snapshots exist.
await payload.updateGlobal({
  slug: 'consent-settings',
  data: { policyVersion: '1', bannerVersion: '1' },
  overrideAccess: true,
})
await payload.updateGlobal({
  slug: 'tracking-settings',
  data: { siteKey: 'dev-site' },
  overrideAccess: true,
})
await payload.updateGlobal({
  slug: 'email-settings',
  data: {
    provider: 'smtp',
    fromName: 'Funnel Platform',
    fromEmail: 'hello@go.localhost',
    postalAddress: '1 Demo Street, Example City',
  },
  overrideAccess: true,
})

payload.logger.info(
  'seed complete: open http://go.localhost:8080/ (admin: http://localhost:8080/admin)',
)
process.exit(0)
