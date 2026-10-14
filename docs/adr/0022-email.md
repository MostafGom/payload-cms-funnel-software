# ADR-0022: Email

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-EML

## Decision

- **Providers:** an adapter interface with `send`, `parseWebhook` and `verifySignature`. Postmark or Resend first, SES later.
- **Templates** are built with react-email.
- **Sequences:** the database is the source of truth for enrollments (`next_run_at`), and a scheduler role advances them.
- **Unsubscribe and bounces:** RFC 8058 one-click unsubscribe, a suppression list, and automatic suppression on bounce or complaint.
- **Before launch:** a dedicated sending subdomain with SPF, DKIM and DMARC.
