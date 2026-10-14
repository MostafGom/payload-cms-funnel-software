import type { GlobalConfig } from 'payload'
import { ConsentSettingsSnapshot, EmailSettingsSnapshot } from '@fp/contracts'
import { encryptSecret } from '@fp/platform/crypto'
import { keyring } from '@/lib/cdp'
import { canConfigure, isAdmin, isAuthenticated } from '../access/roles'
import { revealSecret, secretField } from '../fields/secret'
import { revalidateAllSites, revalidateTagSafe } from '../hooks/revalidate'
import { globalSnapshotHook } from '../hooks/snapshot'

/** Consent banner and regional matrix (FR-CNS-1/2, ADR-0011). */
export const ConsentSettings: GlobalConfig = {
  slug: 'consent-settings',
  admin: { group: 'Settings' },
  access: { read: () => true, update: canConfigure },
  hooks: {
    afterChange: [
      globalSnapshotHook({
        kind: 'consent_settings',
        slug: 'consent-settings',
        schema: ConsentSettingsSnapshot,
        build: (doc) => ({
          policyVersion: String(doc.policyVersion ?? '1'),
          bannerVersion: String(doc.bannerVersion ?? '1'),
          overrides: ((doc.overrides as { region: string; regime: 'opt_in' }[]) ?? []).map((o) => ({
            region: o.region.toUpperCase(),
            regime: o.regime,
          })),
          defaultRegime: (doc.defaultRegime as 'notice') ?? 'notice',
        }),
      }),
      revalidateAllSites,
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'policyVersion',
          type: 'text',
          required: true,
          defaultValue: '1',
          admin: { description: 'Bump to re-ask everyone.' },
        },
        { name: 'bannerVersion', type: 'text', required: true, defaultValue: '1' },
        { name: 'privacyPolicyUrl', type: 'text', defaultValue: '/privacy' },
      ],
    },
    { name: 'title', type: 'text', localized: true, defaultValue: 'Your privacy' },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      defaultValue:
        'We use cookies to measure our site and, with your permission, to show you relevant ads. You can change your choice at any time.',
    },
    {
      type: 'row',
      fields: [
        { name: 'acceptLabel', type: 'text', localized: true, defaultValue: 'Accept all' },
        { name: 'rejectLabel', type: 'text', localized: true, defaultValue: 'Reject all' },
        { name: 'manageLabel', type: 'text', localized: true, defaultValue: 'Choose' },
      ],
    },
    {
      name: 'defaultRegime',
      type: 'select',
      defaultValue: 'notice',
      admin: { description: 'Regime for regions not in the built-in table.' },
      options: [
        { label: 'Opt-in', value: 'opt_in' },
        { label: 'Opt-out', value: 'opt_out' },
        { label: 'Notice only', value: 'notice' },
      ],
    },
    {
      name: 'overrides',
      type: 'array',
      admin: { description: 'Region (ISO country or US-CA style) overrides.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'region', type: 'text', required: true },
            {
              name: 'regime',
              type: 'select',
              required: true,
              options: [
                { label: 'Opt-in', value: 'opt_in' },
                { label: 'Opt-out', value: 'opt_out' },
                { label: 'Notice only', value: 'notice' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

/** SDK behaviour (FR-TRK-1). The site key must exist in COLLECTOR_SITE_KEYS. */
export const TrackingSettings: GlobalConfig = {
  slug: 'tracking-settings',
  admin: { group: 'Settings' },
  access: { read: () => true, update: canConfigure },
  hooks: { afterChange: [revalidateAllSites] },
  fields: [
    { name: 'siteKey', type: 'text', required: true, defaultValue: 'dev-site' },
    {
      type: 'row',
      fields: [
        { name: 'autocaptureClicks', type: 'checkbox', defaultValue: true },
        { name: 'scrollDepth', type: 'checkbox', defaultValue: true },
        { name: 'trackForms', type: 'checkbox', defaultValue: true },
        { name: 'spaPageviews', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'sessionTimeoutMinutes', type: 'number', defaultValue: 30, min: 5, max: 240 },
    {
      name: 'debug',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Log SDK activity to the browser console.' },
    },
  ],
}

/** Sending identity and provider (FR-EML-3, ADR-0022). */
export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  admin: { group: 'Settings' },
  access: { read: isAuthenticated, update: isAdmin },
  hooks: {
    afterChange: [
      globalSnapshotHook({
        kind: 'email_settings',
        slug: 'email-settings',
        schema: EmailSettingsSnapshot,
        build: (doc) => {
          const apiKey = revealSecret(doc.apiKey)
          return {
            provider: (doc.provider as 'smtp') ?? 'smtp',
            fromName: String(doc.fromName ?? 'Funnel Platform'),
            fromEmail: String(doc.fromEmail ?? 'hello@example.com'),
            replyTo: (doc.replyTo as string) || undefined,
            postalAddress: (doc.postalAddress as string) ?? '',
            credentials: apiKey
              ? encryptSecret(
                  JSON.stringify({ apiKey, region: doc.sesRegion ?? undefined }),
                  keyring(),
                )
              : undefined,
            messageStream: (doc.messageStream as string) || undefined,
          }
        },
      }),
    ],
  },
  fields: [
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'smtp',
      options: [
        { label: 'SMTP (dev / Mailpit)', value: 'smtp' },
        { label: 'Postmark', value: 'postmark' },
        { label: 'Resend', value: 'resend' },
        { label: 'Amazon SES', value: 'ses' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fromName', type: 'text', defaultValue: 'Funnel Platform' },
        { name: 'fromEmail', type: 'email', defaultValue: 'hello@example.com' },
        { name: 'replyTo', type: 'email' },
      ],
    },
    {
      name: 'postalAddress',
      type: 'textarea',
      admin: { description: 'Shown in the footer of marketing email (CAN-SPAM).' },
    },
    secretField(
      'apiKey',
      'Provider API key',
      'Postmark server token, Resend key, or SES "accessKeyId:secret".',
    ),
    {
      type: 'row',
      fields: [
        { name: 'messageStream', type: 'text', admin: { description: 'Postmark message stream' } },
        { name: 'sesRegion', type: 'text' },
      ],
    },
  ],
}

/** Feature flags (ADR-0023): dark launches and gradual rollouts. */
export const FeatureFlags: GlobalConfig = {
  slug: 'feature-flags',
  admin: { group: 'Settings' },
  access: { read: isAuthenticated, update: isAdmin },
  hooks: { afterChange: [({ doc }) => (revalidateTagSafe('feature-flags'), doc)] },
  fields: [
    {
      name: 'flags',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'enabled', type: 'checkbox', defaultValue: false },
            { name: 'rolloutPercent', type: 'number', defaultValue: 100, min: 0, max: 100 },
          ],
        },
        { name: 'description', type: 'text' },
      ],
    },
  ],
}
