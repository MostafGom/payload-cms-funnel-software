import type { Block } from 'payload'

export const FormBlock: Block = {
  slug: 'form',
  interfaceName: 'FormBlock',
  labels: { singular: 'Form', plural: 'Forms' },
  fields: [
    { name: 'form', type: 'relationship', relationTo: 'forms', required: true },
    { name: 'heading', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'privacyNote',
      type: 'textarea',
      localized: true,
      defaultValue: 'We respect your privacy. Unsubscribe at any time.',
    },
  ],
}
