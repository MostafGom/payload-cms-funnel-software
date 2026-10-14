import type { Block } from 'payload'

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true, localized: true },
        {
          type: 'row',
          fields: [
            { name: 'author', type: 'text', required: true },
            { name: 'role', type: 'text', localized: true },
          ],
        },
        { name: 'avatar', type: 'upload', relationTo: 'media' },
        { name: 'rating', type: 'number', min: 1, max: 5 },
      ],
    },
  ],
}
