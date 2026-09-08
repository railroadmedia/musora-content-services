---
date: 2026-07-20
branch: chore/MU2-1724-songs-lessons-counts
pr: https://github.com/railroadmedia/musora-content-services/pull/1012
status: open
tags: [[chore]]
---

# Song and lesson counts query

## Context
Needed a way to get the total number of songs vs. individual playable lessons in Sanity, globally or scoped to a brand. Content types don't map 1:1 onto "song" vs "lesson" — songs include `song`, `play-along`, `jam-track`, `song-tutorial-lesson` per `SONG_TYPES` in `contentTypeConfig.js`, and a "lesson" is any published, top-level (no `parent_type` / empty `parent_content_reference`) document with a `railcontent_id`, regardless of `_type`. The final filter definitions came out of a discussion with teammates, converging on `status == 'published' && defined(railcontent_id)` plus the parent-less check for lessons.

## Decision
Added `fetchSongAndLessonCounts(brand?)` in `src/services/content/counts.ts`, returning `{ songs, lessons, total }`.
- Filter logic built with the `Filters` helper (`src/lib/sanity/filter.ts`) and `query()` builder (`src/lib/sanity/query.ts`) instead of hand-interpolated GROQ strings, for consistency with `artist.ts`/`genre.ts`/`instructor.ts`.
- Query executed via `SanityClient.executeQuery` (`src/infrastructure/sanity/SanityClient.ts`) rather than the legacy `fetchSanity` in `sanity.js` — `executeQuery` returns the raw object result directly, which fits an object-shaped `{songs, lessons}` GROQ query better than `fetchSanity`'s array-oriented `isList` handling.
- `total` is computed in application code (`songs + lessons`) after the query resolves, not inside GROQ, keeping the query itself to two independent counts.
- Kept `content.ts` as a types-only file (its original purpose) — the new function and its `SongAndLessonCounts` interface live in the new `counts.ts` file instead, matching the one-file-per-concern convention in `src/services/content/`.

## Alternatives Considered
- Hand-built GROQ query with `${brand}` string interpolation (the version worked out iteratively with the Sanity MCP) — rejected in favor of the `Filters`/`query` builder for composability and to match existing code style.
- A fluent `.then().then()` chain for the `total` calculation — tried during review, rejected as unnecessary indirection versus a plain `await` + object literal; reverted to match house style (`artist.ts`, `sanity.js` use plain `await` throughout).
- Putting the function directly in `content.ts` — rejected once it became clear that file is types-only elsewhere in the codebase; moved to a dedicated `counts.ts`.

## Process Notes
- `course` vs `course-lesson`: `course` is the parent course entity, `course-lesson` is the individual playable video inside it — easy to conflate when first scoping "lesson" types.
- Lesson types span several groupings in `contentTypeConfig.js` (`individualLessonsTypes`, `entertainmentLessonTypes`, `skill-pack-lesson`, `guided-course-lesson`, `pack-bundle-lesson`, live/student archive types) — rather than enumerate all `_type` values, the final query avoids the type-list entirely and instead filters on the structural "no parent" condition, which is more robust to new content types being added later.
- `pack-bundle-lesson` appears in `SINGLE_PARENT_TYPES` but nowhere else in `contentTypeConfig.js` — possibly legacy/unused; not specifically verified against the live Sanity schema.

## Consequences
- New public function `fetchSongAndLessonCounts` exported from `src/services/content/counts.ts`; needs `npm run build-index` to surface in the generated package index/types.
- Introduces the first consumer of `SanityClient.executeQuery` outside `src/infrastructure/sanity/` — establishes a pattern for future count/aggregate-style queries to use the client class over `fetchSanity`.
