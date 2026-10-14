import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: 'standalone',
  // Workspace packages ship TypeScript source (internal packages pattern).
  transpilePackages: [
    '@fp/attribution',
    '@fp/consent',
    '@fp/contracts',
    '@fp/db',
    '@fp/email',
    '@fp/event-schemas',
    '@fp/experiments',
    '@fp/forms',
    '@fp/platform',
  ],
  poweredByHeader: false,
  devIndicators: false,
  images: { localPatterns: [{ pathname: '/cms/api/media/file/**' }] },
  turbopack: { root: path.resolve(dirname, '../..') },
  outputFileTracingRoot: path.resolve(dirname, '../..'),
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
