import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM envelope for secrets stored in the DB (destination/provider credentials).
 * Format: `v1.<keyId>.<iv b64url>.<tag b64url>.<ciphertext b64url>`; the keyId prefix lets us
 * rotate keys without re-encrypting everything at once (ADR-0012).
 */
export interface Keyring {
  /** Key id used for new encryptions. */
  current: string
  /** keyId -> 32-byte key. */
  keys: Record<string, Buffer>
}

export function parseKeyring(spec: string, current: string): Keyring {
  // spec: "k1:<base64 32 bytes>,k2:<base64 32 bytes>"
  const keys: Record<string, Buffer> = {}
  for (const part of spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const idx = part.indexOf(':')
    const id = part.slice(0, idx)
    const key = Buffer.from(part.slice(idx + 1), 'base64')
    if (!id || key.length !== 32)
      throw new Error(`Invalid key "${id || '?'}": expected 32 bytes base64`)
    keys[id] = key
  }
  if (!keys[current]) throw new Error(`Current key "${current}" not present in keyring`)
  return { current, keys }
}

export function encryptSecret(plaintext: string, ring: Keyring): string {
  const key = ring.keys[ring.current]!
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [
    'v1',
    ring.current,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ct.toString('base64url'),
  ].join('.')
}

export function decryptSecret(token: string, ring: Keyring): string {
  const [version, keyId, iv, tag, ct] = token.split('.')
  if (version !== 'v1' || !keyId || !iv || !tag || ct === undefined)
    throw new Error('Malformed secret token')
  const key = ring.keys[keyId]
  if (!key) throw new Error(`Unknown key id "${keyId}"`)
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString(
    'utf8',
  )
}

export const isEncryptedSecret = (value: string): boolean =>
  value.startsWith('v1.') && value.split('.').length === 5
