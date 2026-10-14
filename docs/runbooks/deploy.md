# Deploy and rollback

1. Tag a release on `main`: `git tag v1.4.0 && git push --tags`. The Release workflow builds and
   pushes `fp-web`, `fp-migrator`, `fp-collector`, `fp-worker` and `fp-postgres`, deploys to
   staging, then waits for approval in the `production` environment.
2. `infra/scripts/deploy.sh` on the app node: pull, run the migrator (`--profile migrate`), then a
   rolling restart per service with health gates. On any failure it redeploys the previous tag.
3. Migrations are expand-only during a deploy (ADR-0020). Destructive steps (drop column) ship in
   a later release once no running version reads the old shape.

Manual rollback: `TAG=<previous> ./infra/scripts/deploy.sh` (migrations are backward compatible
by construction, so code rollback is safe).

Post-deploy checks: Grafana "Funnel Platform: pipeline SLOs" dashboard is green; `/api/readyz` and
`/_t/readyz` return 200; a test submission on the staging funnel shows deliveries in
_Admin → Destination health_.
