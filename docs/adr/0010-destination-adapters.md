# ADR-0010: Destination adapters and retry policy

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-DST

## Decision

- Every destination implements `DestinationAdapter` from `packages/destinations-sdk`. The interface has:
  - `configSchema`, `supportedEvents`, `requiredConsent` and `rateLimit`;
  - `map` (returns a payload or a skip reason), `send` and `classify` (`ok | retryable | rate_limited | fatal`);
  - an optional `browserPixel` definition.
- **Queues:** one BullMQ queue per destination, with a limiter.
- **Retries:** exponential backoff with jitter, honoring `Retry-After`. At most 10 attempts and 72 h, after which the delivery becomes `dead` and raises an alert.
- **Delivery log:** every attempt is recorded in `cdp.destination_deliveries`, with the request redacted and purged after 14 days. Deliveries can be replayed from the admin.
- **Platform API versions** are pinned in each destination's config.
- **Each new adapter ships with:** golden fixtures, a `mock-destinations` route and a feature flag.
