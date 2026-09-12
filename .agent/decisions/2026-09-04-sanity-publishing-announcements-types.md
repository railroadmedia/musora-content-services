---
date: 2026-09-04
branch: chore/sanity-publishing-announcements-types
pr: https://github.com/railroadmedia/musora-content-services/pull/1047
status: open
tags: [[chore]]
---

# Add publishing and announcements Sanity type generation

## Context

The newer `groq`/`SanityClient` query runner (`src/lib/sanity/groq.ts`, `src/lib/sanity/runner.ts`) is generic over result type (`run<T>()`), but there were no precise TypeScript types for the content/publishing workspace or public-announcements Sanity documents to plug in as `T`. Callers had to hand-write interfaces or fall back to loosely-typed shapes.

## Decision

Generated `src/lib/sanity/types/content.d.ts` and `src/lib/sanity/types/public-announcements.d.ts` from the musora-platform-backend Sanity schema using `tools/generate-sanity-types.cjs`. Both files are marked as generator output ("Do not edit by hand; re-run the generator instead.") and cover document shapes like `PublicAnnouncementDocument` plus shared building blocks (`PortableTextBlock`).

## Alternatives Considered

No alternatives considered — this follows the existing generator pattern already used elsewhere in the codebase for Sanity type generation.

## Process Notes

Files are pure generator output, no hand edits. Regenerating via `node tools/generate-sanity-types.cjs` should produce no diff against what's committed.

## Consequences

Consumers of `groq().run<T>()` for content/publishing or public-announcements queries can now import precise types (e.g. `PublicAnnouncementDocument`) instead of writing their own, which also lets those results satisfy the content decorators' structural type constraints (`Decoratable`, `AccessDecoratable`) without extra casting.
