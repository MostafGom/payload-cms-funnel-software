import { createHash, createHmac } from 'node:crypto'

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex')

export const hmacSha256Base64 = (secret: Buffer | string, value: string): string =>
  createHmac('sha256', secret).update(value, 'utf8').digest('base64')

/** True when the value already looks like a SHA-256 hex digest, to avoid double hashing. */
export const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/.test(value)
