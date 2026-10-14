import type { CollectionConfig } from 'payload'
import { canEditContent } from '../access/roles'

/** Local disk in dev; S3 storage adapter is wired in the deployment phase (ADR-0019). */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Content' },
  access: {
    read: () => true,
    create: canEditContent,
    update: canEditContent,
    delete: canEditContent,
  },
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1920 },
    ],
  },
  fields: [{ name: 'alt', type: 'text', required: true, localized: true }],
}
