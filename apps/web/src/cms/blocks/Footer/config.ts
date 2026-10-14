import type { Block } from 'payload'

export const FooterBlock: Block = {
  slug: 'footer',
  interfaceName: 'FooterBlock',
  labels: { singular: 'Footer', plural: 'Footers' },
  fields: [
    { name: 'text', type: 'textarea', localized: true },
    {
      name: 'links',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
      ],
    },
    {
      name: 'showPrivacyChoices',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: '"Your privacy choices" link (CCPA/CPRA).' },
    },
  ],
}
