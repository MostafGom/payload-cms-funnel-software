# Destinations: failures, replay, tokens

**Where to look:** _Admin → Destination health_ (24 h success rate, p95 latency, recent failures);
Grafana alert "Destination failure ratio above 1%"; `cdp.destination_deliveries` for detail
(`last_status_code`, `last_error`, `request_summary` has match keys, never raw PII).

| Status            | Meaning                                                                     | Action                  |
| ----------------- | --------------------------------------------------------------------------- | ----------------------- |
| `retrying`        | transient error (429/5xx/timeout); exponential backoff, honours Retry-After | none                    |
| `failed`          | permanent error (bad token, invalid payload)                                | fix config, then replay |
| `dead`            | still failing 72 h after the event (FR-DST-7)                               | fix, then replay        |
| `skipped_consent` | no marketing consent (FR-DST-6)                                             | expected                |
| `skipped_config`  | destination disabled, missing pixel id or credentials                       | fix config              |

**Replay:** per delivery or "Replay all failed/dead (7 days)" in the admin, or
`POST /api/v1/admin/deliveries/replay {"statuses":["failed","dead"],"days":7,"destinationId":"…"}`.
Platforms deduplicate on `event_id`, so replays never double count. Replays carry no client IP.

**Token rotation:** paste the new token in the destination (the field is write-only, stored
encrypted). The snapshot updates on save; workers pick it up within ~10 s.

**Test events:** keep _Test mode_ on with the platform's test event code (Meta, TikTok) or the
Snap `/validate` endpoint until Test Events shows browser + server events deduplicated.
