import type { TextField } from 'payload'
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@fp/platform/crypto'
import { keyring } from '@/lib/cdp'
import { isAdminField } from '../access/roles'

/** Shown instead of the value; saving it back unchanged keeps the stored secret. */
export const SECRET_MASK = '••••••••'

/**
 * Write-only secret (ADR-0012): encrypted with AES-GCM before storage, never returned to the
 * admin UI or API. Only owners/admins may set it.
 */
export function secretField(
  name: string,
  label: string,
  description?: string,
  generate?: () => string,
): TextField {
  return {
    name,
    label,
    type: 'text',
    admin: {
      description: description ?? 'Stored encrypted. Leave unchanged to keep the current value.',
    },
    access: { create: isAdminField, update: isAdminField },
    hooks: {
      beforeChange: [
        async ({ value, originalDoc, req, collection, global }) => {
          // originalDoc went through afterRead (masked), so read the stored ciphertext directly.
          const id = (originalDoc as { id?: string } | undefined)?.id
          const raw = global
            ? await req.payload.db.findGlobal({ slug: global.slug, req })
            : id && collection
              ? await req.payload.db.findOne({
                  collection: collection.slug,
                  where: { id: { equals: id } },
                  req,
                })
              : null
          const stored = (raw as Record<string, unknown> | null)?.[name]
          const previous = typeof stored === 'string' && isEncryptedSecret(stored) ? stored : null
          if (value === SECRET_MASK || value === undefined)
            return previous ?? (generate ? encryptSecret(generate(), keyring()) : null)
          if (value === null || value === '')
            return generate ? (previous ?? encryptSecret(generate(), keyring())) : null
          if (typeof value === 'string' && isEncryptedSecret(value)) return value
          return encryptSecret(String(value), keyring())
        },
      ],
      // `rawSecrets` is only ever set by server code (snapshot hooks), never by API callers.
      afterRead: [
        ({ value, context }) => (context?.rawSecrets ? value : value ? SECRET_MASK : value),
      ],
    },
  }
}

export const revealSecret = (value: unknown): string | undefined =>
  typeof value === 'string' && isEncryptedSecret(value)
    ? decryptSecret(value, keyring())
    : undefined
