import type { Block } from 'payload'

export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  labels: { singular: 'Video', plural: 'Videos' },
  fields: [
    {
      name: 'source',
      type: 'select',
      defaultValue: 'youtube',
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Upload', value: 'upload' },
      ],
    },
    {
      name: 'videoId',
      type: 'text',
      admin: { condition: (_, s) => s?.source !== 'upload', description: 'e.g. dQw4w9WgXcQ' },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: (_, s) => s?.source === 'upload' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Accessible title (WCAG).' },
    },
  ],
}
