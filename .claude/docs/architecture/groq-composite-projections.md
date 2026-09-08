# Plan: `composite()` — multi-key projections in the query builder (mcs)

Status: proposed, not implemented.
Scope: `src/lib/sanity/query.ts`.
Related: `.claude/docs/architecture/groq-query-builder-execution.md` — independent of it; see "Relationship to the
execution plan" below.

## Context

`src/lib/sanity/query.ts` has one projection slot. It can emit `*[...]{ a, b }` but it cannot
emit a wrapper object whose values are themselves queries:

```groq
{ "data": *[...]{...}, "total": count(*[...]) }
```

That wrapper is the dominant idiom in `src/services/content/`. Because the builder can't express
it, every such call site drops out of the builder and hand-writes a template literal, then calls
the transport directly. Seven sites do this today.

The cost is that the builder is bypassed exactly where queries are most complex, and its output
gets spliced into strings by hand — including one site that relies on implicit `toString()`
(`counts.ts:37`, `${query().and(songsFilter)}` with no `.build()`) while a sibling calls
`.build()` explicitly (`artist.ts:88`). Same idiom, two spellings, no enforcement.

Goal: let the builder express the wrapper, so those sites can use it.

## What the call sites actually do

Across all seven builder-based composite sites there are exactly **two** value forms:

| form | sites |
|---|---|
| `"key": <builder>` | `artist.ts:55`, `genre.ts:55`, `instructor.ts:56`, plus the `"data"` half of the three below |
| `"key": count(<builder>)` | `artist.ts:158-159`, `genre.ts:157-158`, `instructor.ts:157-158`, `counts.ts:37-38`, `counts.ts:62` |

```ts
// counts.ts:36-39 — the only builder → SanityClient path in the repo
const q = `{
  "songs": count(${query().and(songsFilter)}),
  "lessons": count(${query().and(lessonsFilter)})
}`

// instructor.ts:156-159 (artist.ts:157-160 and genre.ts:156-159 identical in shape)
const q = `{
  "data": ${data},
  "total": count(${total})
}`
```

Two forms, one level deep, string keys. That is the entire requirement.

## The `count(...)` half needs no new code

`Filters.count` already exists (`src/lib/sanity/filter.ts:460`):

```ts
static count(filter: string): string {
  return `count(*[${filter}])`
}
```

It is exactly equivalent to what the call sites hand-roll. `build()` ends in `.trim()`
(`query.ts:149`), and for a bare `query().and(x)` the projection, post-filter, ordering and slice
slots are all empty — they collapse to whitespace-only trailing lines that `trim()` removes:

```
count(${query().and(songsFilter)})   ===   count(*[songsFilter])   ===   f.count(songsFilter)
```

So `composite()` must **not** grow a `count()` wrapper of its own. Count values arrive as plain
strings from the existing helper. That collapses the new surface to the one thing genuinely
missing: the object wrapper.

## Design

Seven lines, in `query.ts` beside `query()`, since this is query construction:

```ts
export type CompositeParts = Record<string, QueryBuilder | string>

export const composite = (parts: CompositeParts): string => {
  const entries = Object.entries(parts).map(
    ([key, value]) => `"${key}": ${typeof value === 'string' ? value : value.build()}`
  )

  return `{ ${entries.join(', ')} }`
}
```

A free function, not a builder method — it composes builders rather than extending one, and
`query()` returns a mutable closure object that has no meaningful "add a sibling query" operation.

Call sites become:

```ts
// counts.ts
const q = composite({
  songs: f.count(songsFilter),
  lessons: f.count(lessonsFilter),
})

// instructor.ts / artist.ts / genre.ts
const q = composite({
  data: dataQuery,
  total: f.count(restrictions),
})
```

### Details that matter

- **Keys are always quoted** (`"data"`), matching every existing site. GROQ permits unquoted
  keys; quoting is what is already there and sidesteps keys colliding with GROQ syntax.
- **No trailing comma.** Three sites currently emit `{"data": ${data},}` — a trailing comma
  before `}` (`artist.ts:55`, `genre.ts:55`, `instructor.ts:56`). Sanity evidently tolerates it;
  `join(', ')` simply never produces one. Migrating those sites therefore changes the emitted
  string slightly. Safe — no test asserts those composite strings; `test/unit/lib/query.test.ts`
  covers `build()` output only.
- **Whitespace.** `build()` preserves its template-literal indentation internally
  (`query.ts:143-149`), so composite values inherit multi-line formatting. Functionally
  irrelevant, and identical to what the call sites already send. Do **not** tidy `build()` to fix
  it — 1497 lines of exact-string assertions depend on its current output.
- **Insertion order.** `Object.entries` preserves declaration order for string keys, so emitted
  key order is predictable and testable.
- **`_state()` is not involved.** Composite has no state of its own; it reads `build()` output at
  call time, so it inherits whatever the builders hold at that moment. Given the builders are
  mutable (`query.ts:79-159`), mutating one *after* passing it to `composite()` is a no-op,
  because `composite()` already stringified it. That is the desirable behaviour; worth a test.

### Deliberate limits

- **One level, no nesting.** A `composite()` value cannot itself be a `composite()`. The nested
  shapes in `services/sanity.js:1951-1956` (arrays of `{"type", "count"}` objects) are legacy
  hand-written strings built from raw filter strings, not builders — not migration candidates,
  and they should not drive this design.
- **`f.count` hardcodes the `*` selector.** Correct for all five current count sites, wrong for a
  count over a non-`*` selector. Mark the ceiling rather than generalising for a case nobody has:

  ```ts
  // ponytail: count values come from f.count(filter), which hardcodes the `*` selector.
  // Pass a pre-built string if a count ever needs a different one.
  ```

- **No `sort`/`slice` on the wrapper.** GROQ allows it; no call site wants it.

## Files

| Action | Path |
|---|---|
| edit | `src/lib/sanity/query.ts` — add `CompositeParts` type and `composite()` export |

Nothing else. No service file is modified by this plan — see below.

## Migration

Deliberately **not** part of this change. `composite()` ships unused, then call sites move one at
a time in separate PRs, each verifiable on its own:

1. `counts.ts:36` — simplest, and the only site already on `SanityClient` rather than
   `fetchSanity`.
2. `instructor.ts:156`, `artist.ts:157`, `genre.ts:156` — the `{data, total}` trio.
3. `artist.ts:54`, `genre.ts:54`, `instructor.ts:55` — the single-key `{data}` sites, which are
   the ones whose emitted string changes (trailing comma).

Each migration is behaviour-preserving except for that comma, and none of them touches transport.

## Tests

Extend `test/unit/lib/query.test.ts` — same file, same pure-string-assertion style as the
existing 1497 lines. No new transport, no mocking, no network (`test/setupNetworkGuard.js` is
irrelevant here since `composite()` performs no IO).

- single key with a builder value → `{ "data": *[...] }`
- multiple keys → order preserved, `, ` separator, no trailing comma
- string value passed through verbatim (the `f.count(...)` path)
- mixed builder + string values in one call
- key quoting is applied even for plain identifier-safe keys
- empty object in → `{  }` (assert whatever it actually emits, and keep it stable)
- mutating a builder after passing it to `composite()` does not change the emitted string

Coverage floor is global 40/25/40/40 with a "do not lower these numbers" note
(`jest.config.js:50-55`); a seven-line function with the above cases clears it comfortably.

## Verification

```bash
r mcs npm run test:unit -- test/unit/lib/query.test.ts
r mcs npx tsc --noEmit          # no build step exists; type-check only
npx prettier --check src/lib/sanity/query.ts
```

Equivalence check against today's output, worth running once during implementation — this is the
claim the whole plan rests on:

```ts
const filter = f.combine(f.type('artist'))
console.log(`count(${query().and(filter)})` === f.count(filter))   // expect true
```

## Relationship to the execution plan

`.claude/docs/architecture/groq-query-builder-execution.md` proposes making built queries runnable and returning a
typed `Result`. The two are **independent and can ship in either order**:

- `composite()` is pure string construction. It works today with `sanityClient.executeQuery(q)`
  and `fetchSanity(q, ...)` exactly as the call sites already use them.
- If the execution plan lands, it gains a one-line convenience in `runner.ts`:

  ```ts
  export const runComposite = <T>(parts: CompositeParts, runner: QueryRunner = defaultRunner()) =>
    runner.run<T>(composite(parts))
  ```

That ordering matters: the execution plan's `run()` serves zero existing call sites on its own,
because every builder-based site is composite. Landing `composite()` first is what gives it
somewhere to land.

## Divergence from the PHP plan

No mpb counterpart. `Groq` has the identical single-projection-slot limitation, but zero call
sites demanding a composite — `SanityGateway` builds its `{...}` wrappers as raw strings and does
not use the builder at all. Building it there now would be speculative. Add it to mpb when a real
query needs it.
