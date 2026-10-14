import type { CollectionConfig } from 'payload'
import { DestinationSnapshot, DESTINATION_TYPES } from '@fp/contracts'
import { randomBytes } from 'node:crypto'
import { encryptSecret } from '@fp/platform/crypto'
import { EVENT_REGISTRY } from '@fp/event-schemas'
import { keyring } from '@/lib/cdp'
import { canConfigure, isAuthenticated } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { revalidateAllSites } from '../hooks/revalidate'
import { snapshotHooks } from '../hooks/snapshot'
import { revealSecret, secretField } from '../fields/secret'

/** Platform defaults for our canonical events (FR-DST-1..3, FR-DST-9). */
export const DEFAULT_EVENT_MAP: Record<string, { source: string; target: string }[]> = {
  meta: [{ source: 'form_submitted', target: 'Lead' }],
  tiktok: [{ source: 'form_submitted', target: 'SubmitForm' }],
  snap: [{ source: 'form_submitted', target: 'SIGN_UP' }],
  webhook: [{ source: 'form_submitted', target: 'form.submitted' }],
}

const snapshot = snapshotHooks({
  kind: 'destination',
  collection: 'destinations',
  schema: DestinationSnapshot,
  build: (doc) => {
    const creds: Record<string, string> = {}
    const token = revealSecret(doc.accessToken)
    const secret = revealSecret(doc.webhookSecret)
    if (token) creds.accessToken = token
    if (secret) creds.webhookSecret = secret
    const map =
      (doc.eventMap as { source: string; target: string; enabled?: boolean }[] | undefined) ?? []
    return {
      id: String(doc.id),
      name: String(doc.name),
      type: doc.type as 'meta',
      enabled: !!doc.enabled,
      testMode: !!doc.testMode,
      testEventCode: (doc.testEventCode as string) || undefined,
      pixelId: (doc.pixelId as string) || undefined,
      browserPixel: doc.browserPixel !== false,
      credentials: Object.keys(creds).length
        ? encryptSecret(JSON.stringify(creds), keyring())
        : undefined,
      endpointUrl: (doc.endpointUrl as string) || undefined,
      eventMap: (map.length ? map : (DEFAULT_EVENT_MAP[String(doc.type)] ?? [])).map((m) => ({
        source: m.source,
        target: m.target,
        enabled: 'enabled' in m ? m.enabled !== false : true,
      })),
      rateLimitPerSecond: (doc.rateLimitPerSecond as number) ?? 50,
      limitedDataUse: doc.limitedDataUse !== false,
      includeBots: !!doc.includeBots,
    }
  },
})

/** Pixels, server-to-server APIs and webhooks (FR-DST-*, ADR-0010). */
export const Destinations: CollectionConfig = {
  slug: 'destinations',
  admin: {
    useAsTitle: 'name',
    group: 'Marketing',
    defaultColumns: ['name', 'type', 'enabled', 'testMode'],
  },
  access: {
    read: isAuthenticated,
    create: canConfigure,
    update: canConfigure,
    delete: canConfigure,
  },
  hooks: {
    afterChange: [snapshot.afterChange, revalidateAllSites, auditHooks('destinations').afterChange],
    afterDelete: [snapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: DESTINATION_TYPES.map((t) => ({
            label: {
              meta: 'Meta (Pixel + CAPI)',
              tiktok: 'TikTok (Pixel + Events API)',
              snap: 'Snap (Pixel + CAPI)',
              webhook: 'Webhook',
            }[t],
            value: t,
          })),
        },
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        {
          name: 'testMode',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: 'Send test events only (FR-DST-8).' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'pixelId',
          type: 'text',
          admin: { condition: (d) => d?.type !== 'webhook', description: 'Pixel / dataset id' },
        },
        { name: 'testEventCode', type: 'text', admin: { condition: (d) => d?.type !== 'webhook' } },
      ],
    },
    {
      name: 'browserPixel',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (d) => d?.type !== 'webhook',
        description: 'Also load the browser pixel (shares event_id with the server event).',
      },
    },
    {
      ...secretField('accessToken', 'Access token', 'CAPI / Events API token. Stored encrypted.'),
      admin: { condition: (d) => d?.type !== 'webhook' },
    },
    {
      name: 'endpointUrl',
      type: 'text',
      admin: {
        condition: (d) => d?.type === 'webhook',
        description: 'HTTPS URL receiving Standard Webhooks.',
      },
    },
    {
      ...secretField(
        'webhookSecret',
        'Signing secret',
        'whsec_… (base64). Generated if empty.',
        () => `whsec_${randomBytes(24).toString('base64')}`,
      ),
      admin: { condition: (d) => d?.type === 'webhook' },
    },
    {
      name: 'eventMap',
      type: 'array',
      admin: { description: 'Our event -> platform event. Empty uses the platform default.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'source',
              type: 'select',
              required: true,
              options: Object.keys(EVENT_REGISTRY).map((n) => ({ label: n, value: n })),
            },
            { name: 'target', type: 'text', required: true },
            { name: 'enabled', type: 'checkbox', defaultValue: true },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'rateLimitPerSecond', type: 'number', defaultValue: 50, min: 1 },
        {
          name: 'limitedDataUse',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            condition: (d) => d?.type === 'meta',
            description: 'Apply LDU to opted-out US visitors.',
          },
        },
        { name: 'includeBots', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
