import type { CollectionConfig } from 'payload'
import { canEditCrm, isAuthenticated } from '../access/roles'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: { useAsTitle: 'name', group: 'CRM' },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: canEditCrm },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'color', type: 'text', admin: { description: 'Hex, e.g. #4f46e5' } },
  ],
}

export const Lists: CollectionConfig = {
  slug: 'lists',
  admin: { useAsTitle: 'name', group: 'CRM' },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: canEditCrm },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
  ],
}

export const Notes: CollectionConfig = {
  slug: 'notes',
  admin: {
    useAsTitle: 'body',
    group: 'CRM',
    defaultColumns: ['contact', 'body', 'author', 'createdAt'],
  },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: canEditCrm },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user) data.author = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'contact', type: 'relationship', relationTo: 'contacts', required: true, index: true },
    { name: 'body', type: 'textarea', required: true },
    { name: 'author', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
  ],
}

/** Custom field definitions (FR-CRM-3); values live in contacts.customFields[key]. */
export const CustomFieldDefinitions: CollectionConfig = {
  slug: 'custom-field-definitions',
  labels: { singular: 'Custom field', plural: 'Custom fields' },
  admin: { useAsTitle: 'label', group: 'CRM', defaultColumns: ['label', 'key', 'type'] },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: canEditCrm },
  fields: [
    { name: 'label', type: 'text', required: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      validate: (v: string | null | undefined) =>
        (!!v && /^[a-z][a-z0-9_]{0,63}$/.test(v)) || 'snake_case key',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'text',
      options: ['text', 'number', 'date', 'boolean', 'select'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'options',
      type: 'text',
      hasMany: true,
      admin: { condition: (d) => d?.type === 'select' },
    },
    {
      name: 'pii',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Hidden from analysts and erased on DSAR.' },
    },
  ],
}
