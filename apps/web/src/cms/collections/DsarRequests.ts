import type { CollectionConfig } from 'payload'
import { canConfigure, isAdmin, piiRead } from '../access/roles'
import { auditHooks } from '../hooks/audit'

/** Statutory response windows (FR-CNS-4). */
export const DSAR_DEADLINE_DAYS = { gdpr: 30, ccpa: 45, other: 30 } as const

/** Data-subject requests: access, export, delete with verification and deadlines (FR-CNS-4). */
export const DsarRequests: CollectionConfig = {
  slug: 'dsar-requests',
  labels: { singular: 'Data request', plural: 'Data requests' },
  admin: {
    group: 'Settings',
    useAsTitle: 'subjectEmail',
    defaultColumns: ['type', 'subjectEmail', 'status', 'dueAt'],
  },
  access: { read: canConfigure, create: canConfigure, update: canConfigure, delete: isAdmin },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create' || !originalDoc?.dueAt) {
          const received = new Date(data.receivedAt ?? Date.now())
          data.receivedAt = received.toISOString()
          const days =
            DSAR_DEADLINE_DAYS[(data.regime as keyof typeof DSAR_DEADLINE_DAYS) ?? 'gdpr'] ?? 30
          data.dueAt = new Date(received.getTime() + days * 86_400_000).toISOString()
        }
        return data
      },
    ],
    afterChange: [auditHooks('dsar-requests').afterChange],
  },
  endpoints: [
    {
      path: '/:id/execute',
      method: 'post',
      handler: async (req) => {
        const { executeDsar } = await import('@/lib/privacy')
        return executeDsar(req)
      },
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Access / export', value: 'export' },
            { label: 'Deletion (erasure)', value: 'delete' },
          ],
        },
        {
          name: 'regime',
          type: 'select',
          defaultValue: 'gdpr',
          options: [
            { label: 'GDPR / UK GDPR (30 days)', value: 'gdpr' },
            { label: 'CCPA / US states (45 days)', value: 'ccpa' },
            { label: 'Other (30 days)', value: 'other' },
          ],
        },
      ],
    },
    { name: 'subjectEmail', type: 'email', required: true, access: { read: piiRead } },
    { name: 'contact', type: 'relationship', relationTo: 'contacts' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'received',
      index: true,
      options: [
        { label: 'Received', value: 'received' },
        { label: 'Identity verified', value: 'verified' },
        { label: 'Completed', value: 'completed' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'verificationMethod',
      type: 'text',
      admin: { description: 'How identity was verified (required before executing).' },
    },
    {
      type: 'row',
      fields: [
        { name: 'receivedAt', type: 'date' },
        { name: 'dueAt', type: 'date', admin: { readOnly: true } },
        { name: 'completedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    {
      name: 'result',
      type: 'json',
      admin: { readOnly: true, description: 'Export payload or erasure summary.' },
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'execute',
      type: 'ui',
      admin: { components: { Field: '@/cms/components/DsarExecute#DsarExecute' } },
    },
  ],
}
