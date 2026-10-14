# ADR-0016: A/B experiments

- Status: Accepted
- Date: 2026-10-13
- Requirements: FR-FUN-5

## Decision

- **Assignment** happens in `proxy.ts`: `hash(anonymous_id or a temporary id, experiment_id)` is compared against the variant weights.
- **Stickiness:** a cookie `_cm_x_<id>` keeps the visitor in their variant. They are rewritten to the variant's statically built page, so caching still works.
- **Exposure:** the page emits an `experiment_exposed` event.
- **Statistics:** a two-proportion z-test plus a Bayesian probability-to-beat. Results show a warning below the minimum sample size.
- **Scope:** marketing experiments are a domain feature, separate from feature flags (ADR-0023).
