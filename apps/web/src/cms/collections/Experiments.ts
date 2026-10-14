import type { CollectionConfig } from 'payload'
import { ExperimentSnapshot } from '@fp/contracts'
import { canEditContent, isAuthenticated } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { revalidateAllSites } from '../hooks/revalidate'
import { relId, snapshotHooks } from '../hooks/snapshot'

const snapshot = snapshotHooks({
  kind: 'experiment',
  collection: 'experiments',
  schema: ExperimentSnapshot,
  build: async (doc, req) => ({
    id: String(doc.id),
    name: String(doc.name),
    status: doc.status as 'draft',
    funnelId: relId(doc.funnel),
    stepId: (doc.stepId as string) || undefined,
    goalEvent: (doc.goalEvent as string) || 'form_submitted',
    variants: await Promise.all(
      ((doc.variants as Record<string, unknown>[]) ?? []).map(async (v) => {
        const page = await req.payload.findByID({
          collection: 'pages',
          id: relId(v.page)!,
          depth: 1,
          req,
          overrideAccess: true,
        })
        const host = typeof page.domain === 'object' ? page.domain.hostname : undefined
        return {
          key: String(v.key),
          weight: Number(v.weight ?? 50),
          pageId: String(page.id),
          host,
          path: page.slug === 'home' ? '/' : `/${page.slug}`,
        }
      }),
    ),
  }),
})

/** A/B split per funnel step (FR-FUN-5, ADR-0016). Assignment happens in proxy.ts. */
export const Experiments: CollectionConfig = {
  slug: 'experiments',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'status', 'funnel', 'winner'],
  },
  access: {
    read: isAuthenticated,
    create: canEditContent,
    update: canEditContent,
    delete: canEditContent,
  },
  hooks: {
    afterChange: [snapshot.afterChange, revalidateAllSites, auditHooks('experiments').afterChange],
    afterDelete: [snapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'draft',
          options: ['draft', 'running', 'stopped', 'completed'].map((s) => ({
            label: s,
            value: s,
          })),
        },
        { name: 'goalEvent', type: 'text', defaultValue: 'form_submitted' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'funnel', type: 'relationship', relationTo: 'funnels' },
        {
          name: 'stepId',
          type: 'text',
          admin: { description: 'Funnel step this experiment splits' },
        },
      ],
    },
    {
      name: 'variants',
      type: 'array',
      minRows: 2,
      required: true,
      admin: { description: 'The first variant is the control.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'key',
              type: 'text',
              required: true,
              validate: (v: string | null | undefined) =>
                (!!v && /^[a-z0-9_-]{1,32}$/.test(v)) || 'short key',
            },
            { name: 'weight', type: 'number', required: true, defaultValue: 50, min: 0 },
            { name: 'page', type: 'relationship', relationTo: 'pages', required: true },
          ],
        },
      ],
    },
    { name: 'winner', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'startedAt', type: 'date', admin: { position: 'sidebar' } },
    { name: 'endedAt', type: 'date', admin: { position: 'sidebar' } },
    {
      name: 'results',
      type: 'ui',
      admin: { components: { Field: '@/cms/components/ExperimentResults#ExperimentResults' } },
    },
  ],
}
