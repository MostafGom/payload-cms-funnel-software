import type { CollectionConfig } from 'payload'
import { FunnelSnapshot } from '@fp/contracts'
import { canEditContent, isAuthenticated } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { revalidateFunnel } from '../hooks/revalidate'
import { relId, snapshotHooks } from '../hooks/snapshot'

const snapshot = snapshotHooks({
  kind: 'funnel',
  collection: 'funnels',
  schema: FunnelSnapshot,
  build: (doc) => ({
    id: String(doc.id),
    name: String(doc.name),
    steps: ((doc.steps as Record<string, unknown>[]) ?? []).map((s) => ({
      id: String(s.stepId),
      name: String(s.name),
      type: s.type as 'landing',
      pageId: relId(s.page),
    })),
  }),
})

/** A funnel is an ordered set of steps, each mapped to a page (FR-FUN-1). */
export const Funnels: CollectionConfig = {
  slug: 'funnels',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'domain', 'active', 'updatedAt'],
  },
  access: {
    read: isAuthenticated,
    create: canEditContent,
    update: canEditContent,
    delete: canEditContent,
  },
  hooks: {
    afterChange: [snapshot.afterChange, revalidateFunnel, auditHooks('funnels').afterChange],
    afterDelete: [snapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true },
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      name: 'steps',
      type: 'array',
      minRows: 1,
      required: true,
      admin: {
        description: 'In order. The step id is stable and used in analytics; do not reuse ids.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true },
            {
              name: 'stepId',
              type: 'text',
              required: true,
              validate: (v: string | null | undefined) =>
                (!!v && /^[a-z0-9][a-z0-9-]{0,47}$/.test(v)) || 'kebab-case id',
            },
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'landing',
              options: [
                { label: 'Landing', value: 'landing' },
                { label: 'Form', value: 'form' },
                { label: 'Thank you', value: 'thank_you' },
                { label: 'Custom', value: 'custom' },
              ],
            },
          ],
        },
        { name: 'page', type: 'relationship', relationTo: 'pages', required: true },
        {
          name: 'experiment',
          type: 'relationship',
          relationTo: 'experiments',
          admin: { description: 'A/B split for this step (FR-FUN-5).' },
        },
      ],
    },
  ],
}
