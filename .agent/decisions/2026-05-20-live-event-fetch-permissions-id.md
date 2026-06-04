---
date: 2026-05-20
branch: fix/live-event-fetch-permissions-id
pr: https://github.com/railroadmedia/musora-content-services/pull/982
status: open
tags: [bug-fix]
---

# Include permission_id in live event minimum fields

## Context
Live event consumers downstream of `getLiveFields()` need `permission_id` to resolve access to events. Without it on the returned payload, callers had to issue an extra query (or fall back to defaults) to determine whether the current user is permitted to view a given live event.

## Decision
Add `'permission_id'` to the `minimumFields` array in `getLiveFields()` in `src/contentTypeConfig.js` so the field is projected from Sanity alongside the other core live event fields (`live_event_start_time`, `live_event_end_time`, `live_event_stream_id`, `vimeo_live_event_id`, etc.).

## Alternatives Considered
- Put `permission_id` in `additionalFields` instead of `minimumFields`. Rejected — callers requesting the minimum projection are the ones that gate playback, so they need permission resolution by default.
- Fetch `permission_id` in a separate query at the consumer layer. Rejected — duplicates Sanity round-trips and spreads access logic.

## Consequences
- All live event responses produced via `getLiveFields()` now include `permission_id`.
- Incidental formatting (single-quote and trailing-comma normalization) was applied to the same file by the editor — not behavioral.
