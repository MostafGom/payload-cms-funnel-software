import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { CollectionConfig } from 'payload'
import { EmailSequenceSnapshot, EmailTemplateSnapshot } from '@fp/contracts'
import { canConfigure, isAuthenticated } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { relId, relIds, snapshotHooks } from '../hooks/snapshot'

const templateSnapshot = snapshotHooks({
  kind: 'email_template',
  collection: 'email-templates',
  schema: EmailTemplateSnapshot,
  build: (doc) => ({
    id: String(doc.id),
    name: String(doc.name),
    subject: String(doc.subject),
    preheader: (doc.preheader as string) || undefined,
    html: convertLexicalToHTML({ data: doc.body as never, disableContainer: true }),
    text: convertLexicalToPlaintext({ data: doc.body as never }),
  }),
})

/**
 * Email templates (FR-EML-1). Variables: {{firstName}}, {{email}}, {{confirmUrl}},
 * {{unsubscribeUrl}}. Rendering and escaping happen in the worker (@fp/email).
 */
export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  admin: {
    useAsTitle: 'name',
    group: 'Marketing',
    defaultColumns: ['name', 'subject', 'updatedAt'],
  },
  access: {
    read: isAuthenticated,
    create: canConfigure,
    update: canConfigure,
    delete: canConfigure,
  },
  hooks: {
    afterChange: [templateSnapshot.afterChange, auditHooks('email-templates').afterChange],
    afterDelete: [templateSnapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: { description: 'Supports {{firstName}}.' },
    },
    { name: 'preheader', type: 'text' },
    {
      name: 'body',
      type: 'richText',
      required: true,
      admin: {
        description:
          'Use {{confirmUrl}} in double opt-in templates; the unsubscribe footer is added automatically.',
      },
    },
  ],
}

const sequenceSnapshot = snapshotHooks({
  kind: 'email_sequence',
  collection: 'email-sequences',
  schema: EmailSequenceSnapshot,
  build: (doc) => {
    const trig = (doc.trigger ?? {}) as Record<string, unknown>
    const type = (trig.type as string) ?? 'manual'
    const trigger =
      type === 'form_submitted'
        ? { type, formId: relId(trig.form) }
        : type === 'tag_added'
          ? { type, tagId: relId(trig.tag) }
          : type === 'list_joined'
            ? { type, listId: relId(trig.list) }
            : type === 'segment_entered'
              ? { type, segmentId: relId(trig.segment) }
              : { type: 'manual' }
    const w = (doc.window ?? {}) as Record<string, unknown>
    const exit = (doc.exit ?? {}) as Record<string, unknown>
    return {
      id: String(doc.id),
      name: String(doc.name),
      active: !!doc.active,
      trigger: trigger as never,
      steps: ((doc.steps as Record<string, unknown>[]) ?? []).map((s) => ({
        delayAmount: Number(s.delayAmount ?? 0),
        delayUnit: (s.delayUnit as 'days') ?? 'days',
        templateId: relId(s.template)!,
      })),
      window: w.enabled
        ? {
            days: ((w.days as string[]) ?? ['1', '2', '3', '4', '5']).map(Number),
            startHour: Number(w.startHour ?? 9),
            endHour: Number(w.endHour ?? 17),
            timezone: (w.timezone as string) || 'UTC',
          }
        : undefined,
      exit: {
        tagIds: relIds(exit.tags),
        eventNames: (exit.eventNames as string[]) ?? [],
        segmentId: relId(exit.segment),
      },
    }
  },
})

/** Nurture sequences: trigger, delays, send window, exit conditions (FR-EML-2). */
export const EmailSequences: CollectionConfig = {
  slug: 'email-sequences',
  admin: {
    useAsTitle: 'name',
    group: 'Marketing',
    defaultColumns: ['name', 'active', 'updatedAt'],
  },
  access: {
    read: isAuthenticated,
    create: canConfigure,
    update: canConfigure,
    delete: canConfigure,
  },
  hooks: {
    afterChange: [sequenceSnapshot.afterChange, auditHooks('email-sequences').afterChange],
    afterDelete: [sequenceSnapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'active', type: 'checkbox', defaultValue: false },
    {
      name: 'trigger',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'form_submitted',
          options: [
            { label: 'Form submitted', value: 'form_submitted' },
            { label: 'Tag added', value: 'tag_added' },
            { label: 'Joined list', value: 'list_joined' },
            { label: 'Entered segment', value: 'segment_entered' },
            { label: 'Manual', value: 'manual' },
          ],
        },
        {
          name: 'form',
          type: 'relationship',
          relationTo: 'forms',
          admin: { condition: (_, s) => s?.type === 'form_submitted' },
        },
        {
          name: 'tag',
          type: 'relationship',
          relationTo: 'tags',
          admin: { condition: (_, s) => s?.type === 'tag_added' },
        },
        {
          name: 'list',
          type: 'relationship',
          relationTo: 'lists',
          admin: { condition: (_, s) => s?.type === 'list_joined' },
        },
        {
          name: 'segment',
          type: 'relationship',
          relationTo: 'segments',
          admin: { condition: (_, s) => s?.type === 'segment_entered' },
        },
      ],
    },
    {
      name: 'steps',
      type: 'array',
      minRows: 1,
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'delayAmount',
              type: 'number',
              required: true,
              defaultValue: 0,
              min: 0,
              admin: { description: 'Wait after the previous step' },
            },
            {
              name: 'delayUnit',
              type: 'select',
              defaultValue: 'days',
              options: ['minutes', 'hours', 'days'].map((u) => ({ label: u, value: u })),
            },
            {
              name: 'template',
              type: 'relationship',
              relationTo: 'email-templates',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'window',
      type: 'group',
      admin: { description: 'Only send inside this window (recipient-agnostic timezone).' },
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        {
          name: 'days',
          type: 'select',
          hasMany: true,
          defaultValue: ['1', '2', '3', '4', '5'],
          options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
            label: d,
            value: String(i + 1),
          })),
        },
        {
          type: 'row',
          fields: [
            { name: 'startHour', type: 'number', defaultValue: 9, min: 0, max: 23 },
            { name: 'endHour', type: 'number', defaultValue: 17, min: 1, max: 24 },
            { name: 'timezone', type: 'text', defaultValue: 'UTC' },
          ],
        },
      ],
    },
    {
      name: 'exit',
      type: 'group',
      admin: { description: 'Unsubscribes and bounces always exit.' },
      fields: [
        {
          name: 'tags',
          type: 'relationship',
          relationTo: 'tags',
          hasMany: true,
          admin: { description: 'Exit when any of these tags is added' },
        },
        {
          name: 'eventNames',
          type: 'text',
          hasMany: true,
          admin: { description: 'Exit when the contact performs one of these events' },
        },
        {
          name: 'segment',
          type: 'relationship',
          relationTo: 'segments',
          admin: { description: 'Exit when the contact leaves this segment' },
        },
      ],
    },
  ],
}
