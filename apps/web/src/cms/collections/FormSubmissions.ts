import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated, nobody, piiRead } from '../access/roles'

/** Immutable record of each submission with its full attribution snapshot (FR-FRM-3). */
export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  admin: {
    group: 'CRM',
    useAsTitle: 'eventId',
    defaultColumns: ['form', 'contact', 'status', 'utmSource', 'createdAt'],
  },
  access: { read: isAuthenticated, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'form', type: 'relationship', relationTo: 'forms', required: true, index: true },
    { name: 'formVersion', type: 'text' },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', index: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'accepted',
      index: true,
      options: [
        { label: 'Accepted', value: 'accepted' },
        { label: 'Spam', value: 'spam' },
      ],
    },
    { name: 'spamReason', type: 'text' },
    { name: 'eventId', type: 'text', required: true, unique: true },
    { name: 'anonymousId', type: 'text', index: true },
    { name: 'sessionId', type: 'text' },
    { name: 'data', type: 'json', access: { read: piiRead } },
    { name: 'attribution', type: 'json' },
    { name: 'utmSource', type: 'text', index: true },
    { name: 'utmCampaign', type: 'text' },
    { name: 'funnel', type: 'relationship', relationTo: 'funnels' },
    { name: 'stepId', type: 'text' },
    { name: 'variantKey', type: 'text' },
    { name: 'pageUrl', type: 'text' },
    { name: 'geoCountry', type: 'text' },
    { name: 'consent', type: 'json' },
  ],
}
