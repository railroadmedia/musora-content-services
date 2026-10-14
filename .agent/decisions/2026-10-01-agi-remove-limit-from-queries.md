---
date: 2026-10-01
branch: chore/AGI-remove-limit-from-queries
pr: https://github.com/railroadmedia/musora-content-services/pull/1067
status: open
tags: [[chore]]
related: [[2026-07-20-query-builder-tostring]]
---

# Optional limit in fetchArtists, fetchGenres and fetchInstructors

## Context
`fetchArtists`, `fetchGenres` and `fetchInstructors` destructured their options with a hard-coded `limit = 20`. Callers that wanted the complete list of artists, genres or instructors had no way to express that — the only workaround was to pass an arbitrarily large number. The requirement was to make `limit` genuinely optional, with omission meaning "return everything".

## Decision
Removed the `limit = 20` default from all three services and made the `.slice()` call conditional:

```ts
const { sort = 'lower(name)', offset = 0, limit } = options

const data = query()
  .and(type)
  .order(getSortOrder(sort, brand))
  .select(...)
  .postFilter(postFilter)

if (limit) data.slice(offset, limit)
```

Simply dropping the default was not sufficient and would have shipped a silent breaking change. `QueryBuilder.slice(offset, limit)` in `src/lib/sanity/query.ts` computes its expression as:

```ts
const sliceExpr = !limit ? `[${offset}]` : `[${offset}...${offset + limit}]`
```

A missing `limit` therefore produces `[offset]` — a single-index GROQ slice, the same branch `first()` depends on — not an unbounded one. The response shape would have flipped from `{ data: Artist[] }` to `{ data: Artist }`, and TypeScript would not have caught it because the declared return type stays `Artists`.

Skipping the `.slice()` call instead leaves `state.slice` at its monoid identity (`''`), so `build()` emits no slice expression and GROQ returns the full array.

The guard is placed after the builder chain rather than inside it. This is safe for two reasons, both already covered by `test/unit/lib/query.test.ts`: every builder method returns the same closure instance and mutates shared state (`returns same builder instance for chaining`, `builds valid query after multiple modifications`), and `build()` renders state in a fixed order regardless of call order, so the slice still lands last in the emitted query.

## Alternatives Considered
**Fixing `slice()` itself** to treat a nullish `limit` as "no slice" is the more correct fix — `!limit` is the wrong test, since `limit: 0` also falls through to the single-index branch. Rejected for now because `first()` is implemented as `this.slice()` and relies on that exact branch, making it a wider change than this ticket warranted.

**Honouring `offset` without a `limit`** via a sentinel ceiling (`data.slice(offset, MAX_RESULTS)`). Rejected: GROQ has no open-ended slice syntax (`[5...]` is invalid), so any such value would be arbitrary, and no current caller paginates without a limit.

**Adding a `when(condition, apply)` combinator** to `QueryBuilder` to keep the chain fluent. Rejected as new public API for a single call site. An audit of the other conditional clauses in these queries showed none would adopt it: `searchMatch`, `includedFields` and `progressIds` already return `Filters.empty` when their input is absent, and the `and`/`or` monoids drop empty strings, so conditionality is handled at the filter layer rather than the builder layer.

## Process Notes
The `f.brand(brand)` helper is the one filter that does not self-nullify, which is why four sites spell out `brand ? f.brand(brand) : f.empty` (`counts.ts:26`, `:33`, `:58` and `filter.ts:481`). Making it return `Filters.empty` on a falsy brand would remove those ternaries and match the surrounding idiom, but it was deliberately left alone: an absent brand filter does not return nothing, it returns every brand's content. The required `brand: string` signature currently blocks that mistake at compile time, and the explicit ternary keeps "all brands" a conscious decision at the call site.

The post-chain guard only works because builders are interpolated lazily. `data` is a `QueryBuilder`, not a string; the `q` template literal coerces it via the `toString()` added in [[2026-07-20-query-builder-tostring]], which runs below the guard. Had `build()` been called eagerly at the end of the chain, the conditional slice would have been dropped.

## Consequences
- Omitting `limit` now returns the complete list instead of the first 20 rows.
- `limit: 0` previously produced a single-object response through the faulty `!limit` branch; it now returns the full list.
- An `offset` passed without a `limit` is ignored rather than approximated.
- No caller changes required. Both existing consumers pass an explicit limit: `MusoraApp/src_v2/components/screens/CollectionList.tsx` uses `limit: 50`, and `musora-platform-frontend/src/modules/agi/services/entity.service.ts` defaults `fetchAll` to 40.
- Unbounded queries are now expressible against Sanity, so a caller omitting `limit` on a large brand will fetch every matching document. Worth watching if a new consumer adopts it on a hot path.
- Left unaddressed: the `Artists`, `Genres` and `Instructors` interfaces declare `total: number`, but the query only projects `"data"`. `total` is always `undefined`, so the pagination meta in `entity.service.ts` never populates.
