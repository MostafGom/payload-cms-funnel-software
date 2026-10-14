import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'
import { revalidateDomain } from '../hooks/revalidate'

/** Hosts we serve funnels on (FR-FUN-4). Also the allow-list for Caddy on-demand TLS (ADR-0015). */
export const Domains: CollectionConfig = {
  slug: 'domains',
  admin: {
    useAsTitle: 'hostname',
    group: 'Settings',
    defaultColumns: ['hostname', 'kind', 'active'],
  },
  access: { read: isAuthenticated, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: { afterChange: [revalidateDomain] },
  fields: [
    {
      name: 'hostname',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Exact host, e.g. go.brand.com (no scheme, no port).' },
      validate: (v: string | null | undefined) =>
        (!!v &&
          /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
            v,
          )) ||
        'Lowercase hostname only',
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'funnel',
      options: [
        { label: 'Primary site', value: 'primary' },
        { label: 'Funnel', value: 'funnel' },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      name: 'homePage',
      type: 'relationship',
      relationTo: 'pages',
      admin: { description: 'Page served at "/".' },
    },
  ],
}
