---
date: 2026-04-21
pr: railroadmedia/musora-content-services#932
branch: TMA-239-mcs-sanity-add-a-v2-query-parameter-to-all-sanity-
status: open
tags: [[jira]], [[bug-fix]], [[sanity]], [[cache]]
components: [[fetchSanity]]
---

# Add v=2 query parameter to all Sanity requests to force cache refresh

## Context
All Sanity API requests from musora-content-services were being served with cached responses. Adding a `v=2` query parameter forces a cache refresh, ensuring clients receive up-to-date content.

## Decision
Appended `&v=2` to the `baseUrl` string inside `fetchSanity()` in `src/services/sanity.js`. This is the single location where all Sanity request URLs are constructed, so one targeted change covers every request made through the library.

## Alternatives Considered
- Adding the parameter per call-site: There are dozens of call sites and they all funnel through `fetchSanity`, so modifying the base URL there is cleaner and less error-prone.
- Making it configurable via `sanityConfig`: The ticket does not ask for configurability — it asks for the parameter to be added to all requests unconditionally.

## Process Notes
The `fetchSanity` function at line 1477 of `src/services/sanity.js` is the sole entry point for all Sanity API calls. It builds `baseUrl` on line 1488 and then appends `&query=...` for GET requests or uses it as the POST URL. Appending `&v=2` to `baseUrl` ensures the parameter is present in both cases.

## Consequences
All future Sanity requests from this library will include `v=2`, bypassing any CDN or server-side cache and ensuring fresh content is returned.
