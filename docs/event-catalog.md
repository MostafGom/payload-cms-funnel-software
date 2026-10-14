# Event catalog

Generated from `@fp/event-schemas` (ADR-0008). Do not edit by hand: run `pnpm docs:generate`.

| Event | Version | Conversion | Properties |
| --- | --- | --- | --- |
| `page_viewed` | v1 |  | (none) |
| `element_clicked` | v1 |  | `selector`?: string, `text`?: string, `href`?: string |
| `scroll_depth_reached` | v1 |  | `depth`: integer |
| `form_started` | v1 |  | `form_id`: string |
| `form_abandoned` | v1 |  | `form_id`: string, `last_field`?: string |
| `form_submitted` | v1 | yes | `form_id`: string, `submission_id`?: string |
| `experiment_exposed` | v1 |  | `experiment_id`: string, `variant_key`: string |
| `consent_updated` | v1 |  | `analytics`: boolean, `marketing`: boolean |
| `segment_entered` | v1 |  | `segment_id`: string |
| `segment_exited` | v1 |  | `segment_id`: string |
| `custom` | v1 |  | `custom_name`: string |
