import type { Block, Field } from 'payload'
import { CONTACT_FIELD_TARGETS } from '@fp/contracts'

/**
 * Form field-type registry (FR-FRM-1). Each block maps 1:1 to a `FormFieldSnapshot` variant in
 * @fp/contracts; `formFieldsToSnapshot` converts and the contract test checks every type.
 */
const common = (mapDefault: (typeof CONTACT_FIELD_TARGETS)[number] = 'none'): Field[] => [
  {
    type: 'row',
    fields: [
      { name: 'label', type: 'text', required: true, localized: true },
      {
        name: 'name',
        type: 'text',
        required: true,
        admin: { description: 'Key in submissions, e.g. first_name' },
        validate: (v: string | null | undefined) =>
          (!!v && /^[a-z][a-z0-9_]{0,63}$/.test(v)) || 'snake_case key',
      },
    ],
  },
  {
    type: 'row',
    fields: [
      { name: 'required', type: 'checkbox', defaultValue: false },
      {
        name: 'width',
        type: 'select',
        defaultValue: 'full',
        options: [
          { label: 'Full', value: 'full' },
          { label: 'Half', value: 'half' },
        ],
      },
      {
        name: 'mapTo',
        type: 'select',
        defaultValue: mapDefault,
        options: CONTACT_FIELD_TARGETS.map((t) => ({ label: t, value: t })),
        admin: { description: 'Contact field this value updates (FR-FRM-2).' },
      },
    ],
  },
  {
    name: 'customKey',
    type: 'text',
    admin: { condition: (_, s) => s?.mapTo === 'custom', description: 'Custom field key' },
  },
  { name: 'placeholder', type: 'text', localized: true },
]

const block = (
  slug: string,
  label: string,
  fields: Field[],
  mapDefault?: (typeof CONTACT_FIELD_TARGETS)[number],
): Block => ({
  slug: `field-${slug}`,
  interfaceName: `FormField${label.replace(/\W/g, '')}`,
  labels: { singular: label, plural: `${label} fields` },
  fields: [...common(mapDefault), ...fields],
})

export const FORM_FIELD_BLOCKS: Block[] = [
  block('text', 'Text', [
    {
      type: 'row',
      fields: [
        { name: 'minLength', type: 'number' },
        { name: 'maxLength', type: 'number' },
      ],
    },
  ]),
  block('textarea', 'Textarea', [{ name: 'maxLength', type: 'number' }]),
  block('email', 'Email', [], 'email'),
  block(
    'phone',
    'Phone',
    [
      {
        name: 'defaultCountry',
        type: 'text',
        maxLength: 2,
        admin: { description: 'ISO alpha-2 used to parse national numbers' },
      },
    ],
    'phone',
  ),
  block('select', 'Select', [
    { name: 'multiple', type: 'checkbox', defaultValue: false },
    {
      name: 'options',
      type: 'array',
      minRows: 1,
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
  ]),
  block('checkbox', 'Checkbox', []),
  block('consent', 'Consent', [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'email_marketing',
      options: [
        { label: 'Email marketing', value: 'email_marketing' },
        { label: 'SMS marketing', value: 'sms_marketing' },
        { label: 'Terms of service', value: 'terms' },
        { label: 'Privacy policy', value: 'privacy' },
      ],
    },
  ]),
  block('hidden', 'Hidden', [
    { name: 'defaultValue', type: 'text' },
    { name: 'fromParam', type: 'text', admin: { description: 'Fill from this URL parameter' } },
  ]),
  block('country', 'Country', [], 'country'),
]

type FieldBlockData = Record<string, unknown> & { blockType: string }

/** Admin block data -> FormFieldSnapshot input (validated by the caller). */
export function formFieldsToSnapshot(blocks: FieldBlockData[] | null | undefined) {
  return (blocks ?? []).map((b) => {
    const type = b.blockType.replace(/^field-/, '')
    const base = {
      type,
      name: b.name,
      label: b.label,
      required: !!b.required,
      mapTo: b.mapTo ?? 'none',
      customKey: b.customKey || undefined,
      placeholder: b.placeholder || undefined,
      width: b.width ?? 'full',
    }
    switch (type) {
      case 'text':
        return { ...base, minLength: b.minLength ?? undefined, maxLength: b.maxLength ?? undefined }
      case 'textarea':
        return { ...base, maxLength: b.maxLength ?? undefined }
      case 'phone':
        return { ...base, defaultCountry: (b.defaultCountry as string) || undefined }
      case 'select':
        return {
          ...base,
          multiple: !!b.multiple,
          options: ((b.options as { label: string; value: string }[]) ?? []).map((o) => ({
            label: o.label,
            value: o.value,
          })),
        }
      case 'consent':
        return { ...base, purpose: b.purpose }
      case 'hidden':
        return {
          ...base,
          defaultValue: (b.defaultValue as string) || undefined,
          fromParam: (b.fromParam as string) || undefined,
        }
      default:
        return base
    }
  })
}
