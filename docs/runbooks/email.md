# Email: deliverability, bounces, complaints

- Send from a dedicated subdomain (e.g. `mail.brand.com`); publish SPF, DKIM (from the provider)
  and DMARC (`p=quarantine` after a clean week of `p=none`). Phase 3 exit: mail-tester ≥ 9.
- Configure the provider webhook to `https://brand.com/api/v1/email/webhooks/<postmark|resend|ses>?token=$EMAIL_WEBHOOK_TOKEN`.
  Hard bounces and complaints add a suppression and exit sequences; complaints also unsubscribe.
- Every marketing email has RFC 8058 one-click unsubscribe headers and a footer link; the GET page
  only confirms (link scanners never unsubscribe anyone), POST unsubscribes.
- Double opt-in: forms with _Double opt-in_ send the confirmation template (or the built-in one);
  sequences wait up to 7 days for confirmation, then exit.
