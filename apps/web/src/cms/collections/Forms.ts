import type { CollectionConfig } from 'payload'
import { FormSnapshot, LIFECYCLE_STAGES } from '@fp/contracts'
import { canEditContent, isAuthenticated } from '../access/roles'
import { formFieldsToSnapshot, FORM_FIELD_BLOCKS } from '../fields/formFields'
import { auditHooks } from '../hooks/audit'
import { revalidateTagSafe } from '../hooks/revalidate'
import { relId, relIds, snapshotHooks } from '../hooks/snapshot'

const snapshot = snapshotHooks({
  kind: 'form',
  collection: 'forms',
  schema: FormSnapshot,
  build: (doc) => {
    const actions = (doc.actions ?? {}) as Record<string, unknown>
    const spam = (doc.spam ?? {}) as Record<string, unknown>
    const onSuccess = (doc.onSuccess ?? {}) as Record<string, unknown>
    return {
      id: String(doc.id),
      name: String(doc.name),
      version: String(doc.updatedAt),
      fields: formFieldsToSnapshot(doc.fields as never) as never,
      submitLabel: (doc.submitLabel as string) || 'Submit',
      onSuccess: {
        type: (onSuccess.type as 'next_step' | 'redirect' | 'message') ?? 'next_step',
        redirectUrl: (onSuccess.redirectUrl as string) || undefined,
        message: (onSuccess.message as string) || undefined,
      },
      actions: {
        tagIds: relIds(actions.tags),
        listIds: relIds(actions.lists),
        lifecycleStage: (actions.lifecycleStage as string) || undefined,
        doubleOptIn: !!actions.doubleOptIn,
        confirmationTemplateId: relId(actions.confirmationTemplate),
        sequenceIds: relIds(actions.sequences),
      },
      spam: {
        minSeconds: (spam.minSeconds as number) ?? 2,
        turnstile: !!spam.turnstile,
        blockDisposable: spam.blockDisposable !== false,
      },
    }
  },
})

/** Form builder (FR-FRM-1/7). Only the published version is served and validated (FR-FRM-4). */
export const Forms: CollectionConfig = {
  slug: 'forms',
  admin: { useAsTitle: 'name', group: 'Content', defaultColumns: ['name', '_status', 'updatedAt'] },
  access: {
    read: isAuthenticated,
    create: canEditContent,
    update: canEditContent,
    delete: canEditContent,
  },
  versions: { drafts: true, maxPerDoc: 25 },
  hooks: {
    afterChange: [
      snapshot.afterChange,
      ({ doc }) => {
        revalidateTagSafe(`form:${doc.id}`)
        return doc
      },
      auditHooks('forms').afterChange,
    ],
    afterDelete: [snapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'fields', type: 'blocks', blocks: FORM_FIELD_BLOCKS, minRows: 1, required: true },
    { name: 'submitLabel', type: 'text', defaultValue: 'Submit', localized: true },
    {
      name: 'onSuccess',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          defaultValue: 'next_step',
          options: [
            { label: 'Go to next funnel step', value: 'next_step' },
            { label: 'Redirect to URL', value: 'redirect' },
            { label: 'Show message', value: 'message' },
          ],
        },
        {
          name: 'redirectUrl',
          type: 'text',
          admin: { condition: (_, s) => s?.type === 'redirect' },
        },
        {
          name: 'message',
          type: 'textarea',
          localized: true,
          admin: { condition: (_, s) => s?.type === 'message' },
        },
      ],
    },
    {
      name: 'actions',
      type: 'group',
      admin: { description: 'Post-submit actions (FR-FRM-7).' },
      fields: [
        { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
        { name: 'lists', type: 'relationship', relationTo: 'lists', hasMany: true },
        {
          name: 'lifecycleStage',
          type: 'select',
          options: LIFECYCLE_STAGES.map((s) => ({ label: s, value: s })),
        },
        {
          name: 'doubleOptIn',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Send a confirmation email before marking the contact subscribed.',
          },
        },
        { name: 'confirmationTemplate', type: 'relationship', relationTo: 'email-templates' },
        { name: 'sequences', type: 'relationship', relationTo: 'email-sequences', hasMany: true },
      ],
    },
    {
      name: 'spam',
      type: 'group',
      admin: { description: 'Spam protection (FR-FRM-5). Honeypot and rate limits are always on.' },
      fields: [
        { name: 'minSeconds', type: 'number', defaultValue: 2, min: 0 },
        { name: 'turnstile', type: 'checkbox', defaultValue: false },
        { name: 'blockDisposable', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
