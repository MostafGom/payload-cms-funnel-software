import type { CollectionConfig } from 'payload'
import { LIFECYCLE_STAGES } from '@fp/contracts'
import { sha256Hex, normalizeEmail, normalizePhone, phoneForHashing } from '@fp/platform/crypto'
import { canEditCrm, isAdmin, isAuthenticated, piiRead } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { contactChanged } from '../hooks/contacts'

const pii = { read: piiRead }

/**
 * CRM contact (FR-CRM-1). Flat columns of this table are a read-model contract for workers
 * (ADR-0025, `@fp/db` cms read model); renaming a top-level field is a breaking change.
 */
export const Contacts: CollectionConfig = {
  slug: 'contacts',
  admin: {
    useAsTitle: 'email',
    group: 'CRM',
    defaultColumns: [
      'email',
      'firstName',
      'lastName',
      'lifecycleStage',
      'marketingStatus',
      'createdAt',
    ],
    listSearchableFields: ['email', 'firstName', 'lastName', 'phone'],
    components: {
      views: {
        edit: {
          timeline: {
            Component: '@/cms/components/ContactTimeline#ContactTimeline',
            path: '/timeline',
            tab: { label: 'Timeline', href: '/timeline' },
          },
        },
      },
    },
  },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: isAdmin },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Keep normalized identifiers and their hashes in sync with edits from the admin (FR-FRM-6).
        if ('email' in data) {
          data.email = normalizeEmail(data.email) ?? null
          data.emailHash = data.email ? sha256Hex(data.email) : null
        }
        if ('phone' in data) {
          data.phone = normalizePhone(data.phone, data.country ?? undefined) ?? (data.phone || null)
          data.phoneHash = data.phone ? sha256Hex(phoneForHashing(data.phone)) : null
        }
        return data
      },
    ],
    afterChange: [contactChanged, auditHooks('contacts').afterChange],
    afterDelete: [auditHooks('contacts').afterDelete],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', access: pii },
        { name: 'lastName', type: 'text', access: pii },
      ],
    },
    { name: 'email', type: 'email', unique: true, index: true, access: pii },
    {
      name: 'phone',
      type: 'text',
      index: true,
      access: pii,
      admin: { description: 'E.164, e.g. +14155550123' },
    },
    {
      type: 'row',
      fields: [
        { name: 'country', type: 'text', maxLength: 2, admin: { description: 'ISO alpha-2' } },
        { name: 'city', type: 'text', access: pii },
      ],
    },
    {
      name: 'lifecycleStage',
      type: 'select',
      defaultValue: 'lead',
      index: true,
      options: LIFECYCLE_STAGES.map((s) => ({ label: s.replaceAll('_', ' '), value: s })),
    },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
    { name: 'lists', type: 'relationship', relationTo: 'lists', hasMany: true },
    {
      name: 'customFields',
      type: 'json',
      access: pii,
      admin: { description: 'Values for Custom Field Definitions, keyed by field key (FR-CRM-3).' },
    },
    {
      name: 'marketingStatus',
      type: 'select',
      defaultValue: 'none',
      index: true,
      admin: { position: 'sidebar', description: 'Email marketing consent (FR-EML-1/4).' },
      options: [
        { label: 'Not subscribed', value: 'none' },
        { label: 'Awaiting confirmation', value: 'unconfirmed' },
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    { name: 'optInConfirmedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Merged', value: 'merged' },
        { label: 'Erased', value: 'erased' },
      ],
    },
    {
      name: 'mergedInto',
      type: 'relationship',
      relationTo: 'contacts',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'emailHash',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'phoneHash',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'acquisition',
      type: 'group',
      admin: { description: 'First-touch attribution (FR-FRM-3).' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'utmSource', type: 'text', index: true },
            { name: 'utmMedium', type: 'text' },
            { name: 'utmCampaign', type: 'text', index: true },
          ],
        },
        {
          name: 'clickIdType',
          type: 'text',
          admin: { description: 'fbclid, ttclid, ScCid, gclid…' },
        },
        { name: 'landingPage', type: 'text' },
        { name: 'referrer', type: 'text' },
        { name: 'form', type: 'relationship', relationTo: 'forms' },
        { name: 'funnel', type: 'relationship', relationTo: 'funnels' },
      ],
    },
    { name: 'firstTouch', type: 'json', admin: { readOnly: true } },
    { name: 'lastTouch', type: 'json', admin: { readOnly: true } },
    {
      name: 'consent',
      type: 'json',
      admin: { readOnly: true, description: 'Latest consent snapshot.' },
    },
  ],
  timestamps: true,
}
