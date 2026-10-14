import { createLinkToken, CONFIRM_TTL, UNSUBSCRIBE_TTL } from '@fp/email'
import { emailLinkSecret, serverEnv } from './env'

/** Same construction the worker uses; both sides share EMAIL_LINK_SECRET. */
export const unsubscribeUrl = (contactId: string) =>
  `${serverEnv().NEXT_PUBLIC_SERVER_URL}/api/v1/email/unsubscribe?t=${createLinkToken(emailLinkSecret(), 'unsub', contactId, UNSUBSCRIBE_TTL)}`
export const confirmUrl = (contactId: string) =>
  `${serverEnv().NEXT_PUBLIC_SERVER_URL}/api/v1/email/confirm?t=${createLinkToken(emailLinkSecret(), 'confirm', contactId, CONFIRM_TTL)}`

export const htmlPage = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px;color:#111}@media(prefers-color-scheme:dark){body{background:#0f1115;color:#e8eaed}}button{font:inherit;padding:10px 20px;border-radius:8px;border:0;background:#2357d9;color:#fff;cursor:pointer}</style>
</head><body><h1>${title}</h1>${body}</body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    },
  )
