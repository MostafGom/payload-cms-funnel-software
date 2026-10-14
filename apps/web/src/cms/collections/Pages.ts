import type { CollectionConfig } from 'payload'
import { canEditContent, publishedOrAuthenticated } from '../access/roles'
import { PAGE_BLOCKS } from '../blocks/registry'
import { revalidatePage } from '../hooks/revalidate'
import { auditHooks } from '../hooks/audit'

const previewUrl = (doc: { id?: string }) =>
  doc?.id
    ? `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/api/preview?page=${encodeURIComponent(doc.id)}`
    : null

/** Block-built pages served per host (FR-FUN-2/3/4). Funnels reference pages in Phase 1A. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', 'domain', '_status', 'updatedAt'],
    // Live preview renders the draft through the real site renderer (FR-FUN-3).
    livePreview: { url: ({ data }) => previewUrl(data as { id?: string }) },
    preview: (doc) => previewUrl(doc as { id?: string }),
  },
  access: {
    read: publishedOrAuthenticated,
    create: canEditContent,
    update: canEditContent,
    delete: canEditContent,
  },
  versions: {
    drafts: { autosave: { interval: 1500 }, schedulePublish: true },
    maxPerDoc: 50,
  },
  hooks: { afterChange: [revalidatePage, auditHooks('pages').afterChange] },
  indexes: [{ fields: ['domain', 'slug'], unique: true }],
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Path without leading slash; "home" is served at "/".',
      },
      validate: (v: string | null | undefined) =>
        (!!v && /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(v)) || 'lowercase-kebab path',
    },
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      required: true,
      admin: { position: 'sidebar' },
    },
    { name: 'layout', type: 'blocks', blocks: PAGE_BLOCKS },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'noindex', type: 'checkbox', defaultValue: false },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'tracking',
      type: 'group',
      admin: { description: 'Per-page tracking overrides (FR-FUN-6).' },
      fields: [
        {
          name: 'disableTracking',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'No SDK on this page.' },
        },
        {
          name: 'disablePixels',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Load no ad pixels on this page.' },
        },
        { name: 'disableAutocapture', type: 'checkbox', defaultValue: false },
        {
          name: 'pageEvent',
          type: 'text',
          admin: {
            description: 'Extra custom event fired on view, e.g. viewed_pricing (snake_case).',
          },
          validate: (v: string | null | undefined) =>
            !v || /^[a-z][a-z0-9_]{1,63}$/.test(v) || 'snake_case',
        },
      ],
    },
  ],
}
