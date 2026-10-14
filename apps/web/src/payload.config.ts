import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { Contacts } from './cms/collections/Contacts'
import { Destinations } from './cms/collections/Destinations'
import { Domains } from './cms/collections/Domains'
import { DsarRequests } from './cms/collections/DsarRequests'
import { EmailSequences, EmailTemplates } from './cms/collections/Email'
import { Experiments } from './cms/collections/Experiments'
import { FormSubmissions } from './cms/collections/FormSubmissions'
import { Forms } from './cms/collections/Forms'
import { Funnels } from './cms/collections/Funnels'
import { Media } from './cms/collections/Media'
import { Pages } from './cms/collections/Pages'
import { Segments } from './cms/collections/Segments'
import { CustomFieldDefinitions, Lists, Notes, Tags } from './cms/collections/Tags'
import { Users } from './cms/collections/Users'
import {
  ConsentSettings,
  EmailSettings,
  FeatureFlags,
  TrackingSettings,
} from './cms/globals/Settings'
import { serverEnv } from './lib/env'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const env = serverEnv()

/**
 * Payload owns content, CRM entities, admin and auth; business logic lives in packages/modules
 * (ADR-0002). Schema `cms` is managed by Payload migrations only; no `push` (ADR-0003, ADR-0020).
 */
export default buildConfig({
  serverURL: env.NEXT_PUBLIC_SERVER_URL,
  secret: env.PAYLOAD_SECRET,
  routes: { api: '/cms/api' },
  graphQL: { disable: true }, // ADR-0021
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Funnel Platform' },
    components: {
      views: {
        analytics: {
          Component: '@/cms/components/AnalyticsView#AnalyticsView',
          path: '/analytics',
        },
        deliveries: {
          Component: '@/cms/components/DeliveriesView#DeliveriesView',
          path: '/deliveries',
        },
        duplicates: {
          Component: '@/cms/components/DuplicatesView#DuplicatesView',
          path: '/duplicates',
        },
      },
      afterNavLinks: ['@/cms/components/NavLinks#NavLinks'],
    },
  },
  collections: [
    // Content
    Pages,
    Funnels,
    Forms,
    Experiments,
    Media,
    // CRM
    Contacts,
    FormSubmissions,
    Tags,
    Lists,
    Segments,
    Notes,
    CustomFieldDefinitions,
    // Marketing
    Destinations,
    EmailTemplates,
    EmailSequences,
    // Settings
    Domains,
    Users,
    DsarRequests,
  ],
  globals: [TrackingSettings, ConsentSettings, EmailSettings, FeatureFlags],
  editor: lexicalEditor(),
  localization: {
    // ADR-0024: on from day one; add locales here as markets open.
    locales: [{ code: 'en', label: 'English' }],
    defaultLocale: 'en',
    fallback: true,
  },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    schemaName: 'cms',
    idType: 'uuid',
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  plugins: [
    // Media in S3-compatible storage when configured (ADR-0019); local disk otherwise.
    s3Storage({
      enabled: !!process.env.S3_BUCKET,
      collections: { media: true },
      bucket: process.env.S3_BUCKET ?? '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      },
    }),
  ],
  sharp,
  telemetry: false,
})
