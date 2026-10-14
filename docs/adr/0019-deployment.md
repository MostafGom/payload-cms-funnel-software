# ADR-0019: Deployment

- Status: Accepted
- Date: 2026-10-13
- Requirements: C-3, NFR-1, NFR-9

## Decision

- **Infrastructure:** Docker Compose on 2 VPS, an app node and a data node, with Cloudflare → Caddy in front.
- **Images:** built with `turbo prune` and pushed to GHCR.
- **Rollout:**
  1. A one-shot `migrator` container runs the migrations.
  2. Services restart one at a time, each gated on `/readyz`.
  3. A failed readiness check rolls the deploy back.
- **Backups:** WAL-G to S3-compatible storage, with a nightly restore test.
- **Secrets:** SOPS and age while we are on VPS.
- **Later:** Helm, CloudNativePG and KEDA when we move to Kubernetes.
