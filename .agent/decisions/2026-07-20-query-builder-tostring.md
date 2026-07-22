---
date: 2026-07-20
branch: chore/query-builder-tostring
pr: https://github.com/railroadmedia/musora-content-services/pull/1013
status: open
tags: [[chore]]
related: [[2026-07-20-mu2-1724-songs-lessons-counts]]
---

# QueryBuilder toString()

## Context
`fetchSongAndLessonCounts` (added in `chore/MU2-1724-songs-lessons-counts`) interpolates `query().and(filter)` builders directly into a GROQ template literal, e.g. `` count(${query().and(songsFilter).build()}) ``. The trailing `.build()` at each interpolation site is boilerplate — the same pattern repeats in `artist.ts`, `genre.ts`, and `instructor.ts` wherever a builder's output lands inside a template literal.

## Decision
Added `toString(): string` to `QueryBuilder` (`src/lib/sanity/query.ts`), implemented as `return builder.build()`. JS automatically calls `toString()` during string coercion — template literals, `+` concat, `String(x)` — so a builder can now be interpolated directly: `` count(${query().and(filter)}) ``. This mirrors PHP's `Stringable` interface / Java's `toString()` override.

Swept the existing call sites to drop the now-redundant `.build()`:
- `counts.ts`: both `count(${...})` interpolations.
- `artist.ts`, `genre.ts`, `instructor.ts`: the `data`/`total` variables that are built once and interpolated later into a `q` template literal.

Left `.build()` in place at the one call shape that isn't string interpolation: `fetchArtistBySlug`/`fetchGenreBySlug`/`fetchInstructorBySlug` build `q` and pass it directly as `fetchSanity(q, ...)`'s first argument. Runtime-wise this would also work fine without `.build()` (`encodeURIComponent` inside `fetchSanity` coerces via `ToString` too), but keeping the explicit call there reads clearer for a variable that's a function argument rather than a string-interpolation target.

`.build()` itself was not removed or deprecated — this is purely additive, both call styles remain valid.

## Alternatives Considered
- Removing `.build()` everywhere unconditionally, including the `fetchArtistBySlug`-style direct-argument calls — rejected to keep those call sites' typing/intent explicit (a `q` meant to be "the query string" reads oddly as a `QueryBuilder` object until it's coerced at the call boundary).
- `Symbol.toPrimitive` instead of plain `toString()` — unnecessary; nothing here needs numeric coercion, and plain `toString()` fully covers the template-literal/`String()`/concat cases that matter.

## Process Notes
- Caveat surfaced during review: `JSON.stringify(builder)` does NOT trigger `toString()` — it serializes the object's own enumerable properties instead. Anywhere a builder might end up inside `JSON.stringify`, this would silently produce the wrong output. Not currently a problem (no such call site exists), but worth remembering if a future call site does this.
- Equality checks (`===`) never coerce, so comparing two builders directly still won't compare their query strings.
- This PR is stacked on `chore/MU2-1724-songs-lessons-counts` (PR #1012, unmerged) rather than targeting `main` directly, since it builds on that branch's `counts.ts`. PR base should be retargeted to `main` once #1012 merges.

## Consequences
- `QueryBuilder` consumers can now interpolate a builder directly into a template literal without remembering to call `.build()` — reduces boilerplate at future call sites.
- No behavior change: verified via the full test suite (70 suites) after the sweep, plus an intentional break-and-revert of both `toString()` and the `counts.ts` total-summation logic to confirm the new tests actually catch regressions.
