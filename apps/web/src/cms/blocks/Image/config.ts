import type { Block } from 'payload'

export const ImageBlock: Block = {
  slug: 'image',
  interfaceName: 'ImageBlock',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text', localized: true },
    {
      name: 'size',
      type: 'select',
      defaultValue: 'content',
      options: [
        { label: 'Content width', value: 'content' },
        { label: 'Full width', value: 'full' },
      ],
    },
    {
      name: 'priority',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Above the fold: preload for LCP (NFR-6).' },
    },
  ],
}
