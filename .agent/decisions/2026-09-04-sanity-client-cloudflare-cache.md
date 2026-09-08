---
date: 2026-09-04
branch: refactor/sanity-client-cloudflare-cache
pr: https://github.com/railroadmedia/musora-content-services/pull/1046
status: open
tags: [[chore]]
---

# Route SanityClient through Cloudflare caching proxy

## Context

PR #900 added a Cloudflare caching layer for Sanity queries by pointing the legacy `fetchSanity()` function (`src/services/sanity.js`) at `sanity.musora.com` instead of hitting `*.sanity.io` directly. That change only touched the legacy path. The newer `SanityClient` class (`src/infrastructure/sanity/SanityClient.ts`) builds its request URL independently in `FetchQueryExecutor.buildUrl()`, which still hit `*.sanity.io` directly and bypassed the CF cache entirely.

## Decision

Mirrored the same host rewrite from PR #900 into `FetchQueryExecutor.buildUrl()` (`src/infrastructure/sanity/executors/FetchQueryExecutor.ts`):

```ts
return `https://sanity.musora.com/${config.projectId}/${api}/v${config.version}/${config.dataset}?perspective=${perspective}`
```

No other files needed to change — `DefaultConfigProvider`, `SanityConfig`, and `SanityClient` itself are all host-agnostic and pass through unaffected.

## Alternatives Considered

No alternatives considered — this is a direct parity fix to bring `SanityClient` in line with the URL rewrite already proven in `fetchSanity()`.

## Process Notes

Updated `test/unit/infrastructure/sanity/FetchQueryExecutor.test.ts` — 4 assertions were hardcoded against the old `*.sanity.io` URL format and needed updating to the new `sanity.musora.com` host/path shape.

The diff also shows unrelated prettier-driven reformatting in `src/services/sanity.js` (line wrapping, trailing commas) picked up from a main sync — not part of this change's intent.

## Consequences

Both Sanity query paths (`fetchSanity()` and `SanityClient`) now route through the Cloudflare caching proxy, so queries made via `SanityClient` benefit from the same CDN caching as the legacy path.
