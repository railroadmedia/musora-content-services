---
date: 2026-04-28
pr: TBD
branch: TMA-275-mcs-sanity-add-a-v2-url-segment-to-to-all-sanity-r
status: open
tags: [[jira]], [[bug-fix]]
components: [[sanity]]
---

# Add /v2 URL segment to all Sanity requests to force cache refresh

## Context
Sanity responses were being served from a stale CDN cache. To force a cache refresh, a new URL segment `/v2` needed to be appended after the dataset name in all Sanity API requests. The Jira ticket provided the target URL format: `https://sanity.musora.com/{projectId}/apicdn/v{version}/{dataset}/v2?perspective=...`

## Decision
Modified the `baseUrl` construction in `src/services/sanity.js` (line 1570) to append `/v2` after the dataset segment. This is the single place where all Sanity API request URLs are built, so this one-line change affects all queries made through MCS.

## Alternatives Considered
- Adding a cache-busting query parameter instead of a path segment — rejected because the Jira description explicitly shows the `/v2` path segment as the desired approach.
- Updating config to pass the segment dynamically — unnecessary complexity for a single constant value.

## Process Notes
The URL is constructed in a single location in `fetchFromSanity()` inside `src/services/sanity.js`. Both GET and POST requests use the same `baseUrl`, so the fix applies to all request methods automatically.

## Consequences
All Sanity API requests will now include `/v2` in the path, causing the CDN to treat them as new cache keys and serve fresh data.
