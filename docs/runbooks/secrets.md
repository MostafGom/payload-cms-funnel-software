# Secret rotation

- **Secrets keyring** (`SECRETS_KEYRING`, AES-256-GCM for destination and provider credentials):
  add a new key `k2:<base64 32 bytes>` to the keyring, set `SECRETS_CURRENT_KEY=k2`, deploy.
  New writes use k2, old ciphertexts still decrypt with k1. Re-save each destination and the email
  settings, then remove k1 in a later deploy.
- **EMAIL_LINK_SECRET** (web and worker must match): rotating invalidates outstanding unsubscribe and
  confirmation links; prefer to keep it stable. If compromised, rotate and accept that old links
  show "invalid" (users can still reply to unsubscribe).
- **PAYLOAD_SECRET**: rotating logs every admin out.
- **WALG_LIBSODIUM_KEY**: never rotate in place: old backups need the old key. Start a new
  `WALG_S3_PREFIX` with the new key and keep the old key until those backups expire.
