# ADR-0023: Feature flags

- Status: Accepted
- Date: 2026-10-13

## Decision

- **Mechanism:** OpenFeature SDK with our own provider. Flags are stored in the Payload `feature-flags` global and cached in Valkey for 30 s.
- **Use:** dark launches of new destinations, new blocks and new storage backends.
- **Cleanup:** every flag has an owner and a removal date.
