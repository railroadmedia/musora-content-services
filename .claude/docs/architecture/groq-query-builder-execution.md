# Plan: make built queries runnable, with a typed result (mcs)

Status: implemented.
Scope: `src/lib/sanity/runner.ts`, `src/lib/sanity/groq.ts`, `src/lib/sanity/examples.ts`,
`src/lib/ads/either.ts`.
Depends on: `Coproduct` in `src/lib/ads/` — ported from `chore/ads-structures`, already on this branch.
Related: `.claude/docs/architecture/groq-composite-projections.md` — `composite()` shipped first; this plan builds on it.

## Context

`src/lib/sanity/query.ts` builds GROQ strings and stops there — `build()` returns a string and
nothing runs it. Execution lives in `src/infrastructure/sanity/SanityClient.ts`, and the two are
connected today only by string interpolation, never by a handoff.

The error contract on that client is the specific thing worth fixing. All three public methods
look like they return a null-ish fallback on failure:

```ts
} catch (error: any) {
  this.handleError(error, query)
  return null            // SanityClient.ts:37, :52 (`return []`), :67
}
```

`handleError` is declared `: never` and throws unconditionally (`SanityClient.ts:84-96`), so
**every one of those fallback returns is unreachable**. The real contract is "returns `null` when
the query legitimately matched nothing, throws when the request failed" — two very different
outcomes, one of which is invisible at the type level.
`test/unit/infrastructure/sanity/SanityClient.test.ts:52` asserts the throw, confirming the
intent; the dead code is what misleads readers.

On top of that, the thrown value is an object literal cast to an interface
(`SanityClient.ts:91`, `FetchQueryExecutor.ts:37`) — no stack, fails `instanceof Error`.

Goal: a built query becomes runnable, and the outcome comes back as a value that distinguishes
*matched nothing* from *request failed*, without callers writing `try/catch` around a function
whose signature never mentions throwing.

Settled up front:

- **Additive only.** Existing exported service functions keep throwing / returning `null` exactly
  as they do now. No breaking change for mpf or MusoraApp; mcs publishes to npm via
  standard-version, so a major bump is a real cost and this avoids it.
- **No call sites migrate.** `run()` ships unused, same as `composite()` did. Migration is its own
  PR, one site at a time.

## Design

```
filter.ts ──> query.ts <── groq.ts ──> runner.ts ──> SanityClient
                                │                          │
                                └──returns──> Either<SanityQueryError, T | null>
```

`query()` keeps knowing nothing about transport. The runner is the only place IO happens, and it
is one function wide so tests inject a plain arrow. `groq.ts` is the composition root that joins
them — it imports both, and neither imports the other.

### 1. The result type already exists — use `Coproduct`

`src/lib/ads/coproduct.ts` provides everything an execution result needs, so no `Result` type gets
written:

| what the result needs | `Coproduct<L, R>` |
|---|---|
| success / failure split | `Right` / `Left`, with error on the left |
| narrowing without a cast | `isRight(): this is Right<L, R>` |
| transform the value | `map`, `flatMap` |
| transform the error | `mapLeft`, `flatMapLeft` |
| collapse to one value | `fold(onLeft, onRight)` |
| fall back on failure | `recover(defaultValue)` |
| peek without changing | `tap`, `ltap` |
| unwrap either side | `drop` |

`Left.map()` already returns `new Left(this.value)` rather than `this`, which is the variance
behaviour a hand-written `Result` would have had to guarantee — returning `this` types as
`Left<T, E>` where the signature promises `Coproduct<L, U>`, forcing a cast.

**`Either` is a synonym, not a subclass** (`src/lib/ads/either.ts`):

```ts
export type Either<L, R> = Coproduct<L, R>
export const Either = { left: Coproduct.left, right: Coproduct.right }
```

Categorically the coproduct of `A` and `B` *is* `Either` — `Left`/`Right` are its canonical
injections (`inl`/`inr`), which is why Haskell and Scala both declare them on `Either` directly
with no more general sum type beneath. Making `Either extends Coproduct` would carve at the wrong
joint: the types nearby differ by *algebra*, not shape. `Validation` has the identical two-case
shape but is an applicative that accumulates errors rather than a monad that short-circuits, and
`These` has three cases so it is not a binary coproduct at all. Neither would inherit anything
useful from `Left`/`Right`. In FP shared behaviour comes from typeclasses, and this repo already
has them — `Functor`, `Monad`, `Tappable`, `Foldable`, `Recoverable`, `Droppable` are where a
future structure plugs in.

The alias buys readability at construction (`Either.left(err)` / `Either.right(docs)`) and in
signatures, for nine lines and zero duplication. Trade-off: no `instanceof Either` — use
`isLeft()` / `isRight()`, which narrow properly — and no nominal distinction from `Coproduct`,
correctly, because there isn't one.

**Caveat to state plainly:** `tsconfig.json` has `"strict": false`, so `strictNullChecks` is off
and `null` / `undefined` still flow into both slots unchecked. The ADT narrows what it can; it does
not make the file null-safe. Flipping `strict` even for `src/lib/**` is a separate change with its
own blast radius — out of scope here, worth doing.

### 2. Error value

Folded into `runner.ts` rather than its own module — one class, produced in exactly one place (the
runner's catch), consumed only by callers of `run()`, who import `runner.ts` anyway.

```ts
export class SanityQueryError extends Error {
  constructor(
    message: string,
    public readonly groq: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'SanityQueryError'
  }
}
```

A real `Error` subclass, deliberately — it fixes the `instanceof`-hostile object literals the
Sanity infra throws today.

Three deliberate omissions:

- **No `kind` union, no `status`.** Neither is obtainable here. `createSanityError`
  (`FetchQueryExecutor.ts:89-109`) formats the status into a *message string* and returns
  `{ message, query, params }` with no status field — and when Sanity returns a JSON body with its
  own `message`, the status text is overwritten entirely. Recovering a status would mean either
  regex-parsing messages (fragile, already broken by that overwrite) or editing
  `FetchQueryExecutor`, which this plan does not touch. `Left` vs `Right` already delivers the
  stated goal; a three-way union nobody switches on does not. If a retry policy ever needs "was
  this a 5xx", add `status?: number` to the `SanityError` interface and set it in
  `createSanityError` — two additive lines, obvious at that point which values matter.
- **`cause` is an own property**, not `Error`'s. `target` is `ES2020` with no `lib` override, so
  the ES2022 `new Error(msg, { cause })` overload is not in the type library. A readonly field
  works identically for debugging.
- **No `Object.setPrototypeOf`.** At ES2020 `extends Error` gives working `instanceof` natively.
  `SyncError` (`src/services/sync/errors/index.ts:17`) does it defensively for downlevel builds;
  not needed here.

`groq` is carried because the failing query is the most useful thing in a log line, and
`SanityError` already threads `query` through today (`SanityClient.ts:92`) — nothing is lost
relative to current behaviour.

### 3. Runner — a function type, not an interface

```ts
export type QueryRunner<T = unknown> = (groq: string) => Promise<Either<SanityQueryError, T | null>>

export const sanityRunner =
  <T = unknown>(client: SanityClient = new SanityClient()): QueryRunner<T> =>
  async (groq) => {
    client.refreshConfig()
    try {
      return Either.right<SanityQueryError, T | null>(await client.executeQuery<T>(groq))
    } catch (error: any) {
      return Either.left<SanityQueryError, T | null>(
        new SanityQueryError(error?.message ?? 'Sanity query failed', groq, error)
      )
    }
  }
```

**The generic belongs on the type, not on the call.** The first cut wrote
`QueryRunner = <T>(groq: string) => ...`, promising a runner that works for *every* `T`. No fake
can satisfy that — a test double returns one concrete type — so every fake needed an `as any`, and
three of them were written before anyone noticed. Parameterising the type instead makes a fake
`const fake: QueryRunner<Song[]> = async () => Either.right([])` with no cast.

This was caught by `examples.ts` failing to compile, not by review or tests — see "Why
`examples.ts` exists" below.

One cast survives, inside `defaultRunner`, and is justified: the cached closure never inspects `T`,
it only forwards whatever Sanity returned, so one instance genuinely serves every result type.

A one-method interface is a function type in TypeScript. `src/lib/sanity/` is closure-style —
`query()` is a factory returning an object literal closing over `state`, no classes in the file —
and this lands there, so it matches. It also collapses the testability story to its simplest form:
a fake runner is `async () => Coproduct.right(fixture)`, not a class implementing an interface.

**Target `SanityClient`, not `fetchSanity`.** Two independent transports exist and they are not
interchangeable:

| | `SanityClient` → `FetchQueryExecutor` | `fetchSanity` (`services/sanity.js:1590`) |
|---|---|---|
| host | `{projectId}.api\|apicdn.sanity.io` | `sanity.musora.com/{projectId}/...` |
| errors | throws | `console.error` + `return null` (:1648) |
| decorators | none | applies `needsAccess` / `lifetimeUpgrade` / `pageType` (:1638-1641) |
| DI seam | clean, constructor-injected | none |

`SanityClient` is the one already under test with hand-rolled interface fakes. The consequence to
record: **the decoration step that every `fetchSanity` call site depends on has no equivalent on
this path**, so results from `run()` are undecorated. Any future migration of a `fetchSanity` call
site has to solve that first.

Do **not** add a new executor interface at the infrastructure layer — `QueryExecutor`
(`src/infrastructure/sanity/interfaces/QueryExecutor.ts`) already exists and `SanityClient` already
takes it constructor-injected. The new type belongs in `src/lib/sanity/` because it is about
*results*, not about transport.

### 4. Entry points — a free function, plus `groq()` as a composition root

```ts
let cachedRunner: QueryRunner | undefined
const defaultRunner = (): QueryRunner => (cachedRunner ??= sanityRunner())

export const run = <T>(groq: string, runner: QueryRunner = defaultRunner()) => runner<T>(groq)
```

`run()` deliberately does **not** go on `QueryBuilder`. `query.ts` today imports exactly two
things, `Monoid` and `FieldAccess`, and stays pure string construction. A `run()` method with a
default runner would make `query.ts` statically import the runner → `SanityClient` →
`FetchQueryExecutor`, so every consumer of the builder drags the transport in — and `filter.ts`
imports `query.ts` for `filterOps`, so even importing `Filters` alone would pull it. That matters
for MusoraApp, which imports MCS by subpath specifically to keep its bundle tight.

The fluency is recovered without paying that cost, by putting the join in a **third module**
(`src/lib/sanity/groq.ts`) that imports both while neither imports the other:

```ts
const groqBuilder = (selector?: string): GroqBuilder => {
  const builder = query(selector)
  return Object.assign(builder, {
    run: <T>(runner?: QueryRunner<T>) => run<T>(builder.build(), runner),
  }) as GroqBuilder
}
```

No forwarding methods are needed: every `QueryBuilder` method ends in `return builder` — the same
object reference — so augmenting that object yields a chain that already carries `run()`.

The cost is types, not runtime. `QueryBuilder.and()` is declared to return `QueryBuilder`, so
without help the static type loses `run` after the first call. `GroqBuilder` therefore redeclares
the chainable signatures with narrowed returns — about ten lines, types only, zero runtime effect.
This is the same F-bounded limitation that ruled out subclassing `Either`; here it is worth paying
because there is exactly one subtype, not an open family.

`groq()` also inherits the `first()`/`this` quirk (`query.ts:112`) unchanged, since it augments the
very same object rather than wrapping it.

**Composite queries get the same treatment.** `composite()` still returns a plain string, so
`run(composite({...}))` keeps working. `groq.composite(parts)` wraps it into a `RunnableQuery`:

```ts
export interface RunnableQuery {
  build(): string
  toString(): string
  run<T>(runner?: QueryRunner<T>): Promise<Either<SanityQueryError, T | null>>
}

export interface GroqBuilder extends QueryBuilder, RunnableQuery { /* chainables */ }
```

`RunnableQuery` is deliberately **not** chainable. A composite is terminal — `.and()` on
`{ "data": ..., "total": ... }` is not valid GROQ — so the compiler now rejects what the bare-string
return could never express. Sharing one contract also lets a function accept "anything runnable"
without caring which kind it got.

The two differ in *when* they build, and both tests say so explicitly: `groq()` builds at `.run()`
time, while `groq.composite()` snapshots at call time because `composite()` stringifies its parts
eagerly — shipped behaviour from `.claude/docs/architecture/groq-composite-projections.md`, not introduced here.

A `runComposite` free function was rejected: it would have been a pure alias for
`run(composite(parts))` — one call saved, a second spelling for the same operation, which is
exactly the "same idiom, two spellings, no enforcement" complaint that motivated `composite()`.
`groq.composite()` earns its place instead by returning a different *type*, not just a shorter
spelling.

**No `params` argument.** The builder bakes values in through `and` / `or` / `Filters`, so the
string is complete by the time `run()` sees it. Nothing can supply a param bag, so the argument
would be permanently unused.

> Recorded while deciding this, out of scope but real: `Filters.titleMatch` (`filter.ts:183`) and
> `Filters.searchMatch` (`filter.ts:193`) interpolate caller-supplied text straight into GROQ with
> no escaping — `` `title match "${term}*"` ``. A term containing a double quote closes the literal
> and can widen the filter beyond its intended scope. A `params` argument would not have fixed it,
> because `Filters` builds the string long before `run()` is called; the fix belongs in `Filters`.
> Needs its own investigation into whether user-supplied search text reaches either helper.

### 5. Config freshness

The default runner is a lazy module singleton that calls `refreshConfig()` before every query.

That combination is load-bearing. `initializeService` **mutates** `globalConfig` in place
(`config.js:91`), while `DefaultConfigProvider.getConfig()` returns a **fresh copy**
(`DefaultConfigProvider.ts:28-36`) that `SanityClient` then caches in `this.config`. A long-lived
client without the refresh therefore serves a snapshot taken at its first query — stale after any
re-initialisation, which `initializeTestService()` does between test cases. That is the same class
of bug as the module-level client at `counts.ts:7`.

Refreshing costs a `this.config = null` and a re-read on next use: one object literal and four
truthiness checks. Cheaper than the three allocations a fresh-client-per-call would make, and it
keeps freshness guaranteed.

```ts
// ponytail: refresh per query because initializeService mutates globalConfig in place;
// SanityClient's cached copy would go stale. Drop this if config becomes immutable.
```

Config errors surface as `Left`, not as a throw: `getConfig()` is called *inside* `executeQuery`'s
try block, so "Sanity token is missing in configuration" arrives as a failed result. Consistent —
`run()` never throws — though it does mean a setup bug wears the costume of a query failure. The
message is unambiguous enough to diagnose.

### 6. Empty results are `Right(null)`

`executeQuery` returns `response.result`, which is `null` when nothing matched
(`SanityClient.ts:64`). That is a **success**. `Left` stays reserved for failure, which is the
distinction this plan exists to draw; collapsing them would reinstate the ambiguity. It also
matches the transport, where `fetchList` returns `[]` and `fetchSingle` returns `null` on empty.

The surprise to document in the JSDoc:

```ts
const result = await run<Song[]>(groq)
result.recover([])   // → null when nothing matched, NOT []
```

`recover` only replaces a `Left`. A caller wanting "empty list when nothing matched" writes
`.map(docs => docs ?? []).recover([])`, or folds. Layering `Maybe` on top of `Coproduct` to model
this is not worth it for zero consumers.

### 7. Public API surface

`tools/generate-index.cjs` scrapes **`src/services/**` only**, so nothing added under `src/lib/`
reaches `src/index.js` automatically. Consumers reach it through the subpath export —
`"./*": "./src/*"` in package.json already permits
`musora-content-services/src/lib/sanity/runner`, which is how MusoraApp already imports the sync
system. Subpath only, at least until something in `src/services/` uses it.

## Files

| Action | Path |
|---|---|
| new | `src/lib/ads/either.ts` — `Either` type alias and constructors over `Coproduct` |
| new | `src/lib/sanity/runner.ts` — `SanityQueryError`, `QueryRunner`, `sanityRunner`, `run` |
| new | `src/lib/sanity/groq.ts` — `RunnableQuery`, `GroqBuilder`, `groq`, `groq.composite` |
| new | `src/lib/sanity/examples.ts` — compile-checked usage of the whole pipeline |
| new | `test/unit/lib/ads/either.test.ts` |
| new | `test/unit/lib/sanity/runner.test.ts` |
| new | `test/unit/lib/sanity/groq.test.ts` |

`query.ts`, `filter.ts`, `SanityClient.ts`, `FetchQueryExecutor.ts`, `services/sanity.js` and every
existing service function are **not** modified.

## Tests

Fakes are built by constructing a **real** `SanityClient` with fake collaborators, not by mocking
the client itself:

```ts
const throwingExecutor: QueryExecutor = {
  execute: async () => { throw new Error('network down') },
}
const client = new SanityClient(stubConfigProvider, throwingExecutor)
```

Both constructor dependencies are already one-method interfaces. This exercises the *real*
`handleError` path — the executor throws, `SanityClient` converts it to the
`{ message, query, originalError }` object literal, and the runner has to turn that into a
`SanityQueryError`. That conversion is the thing being built; mocking `executeQuery` directly would
test nothing. It also documents honestly that what arrives in the catch is a non-`Error` object
literal, which is why the error wraps rather than rethrows.

Cases:

- executor resolves `{ result: [...] }` → `Right` carrying the docs
- executor resolves `{ result: null }` → `Right(null)`, not `Left`
- executor throws → `Left`, `instanceof SanityQueryError`, `groq` preserved, `cause` carries the
  original
- config provider throws → `Left`, no exception escapes
- `run(groq, fakeRunner)` forwards the string and returns the runner's value untouched
- `refreshConfig` is called before each query

`test/setupNetworkGuard.js` blocks real network calls in unit tests, so injection is required, not
optional. Coverage has a global floor of 40/25/40/40 with a "do not lower these numbers" note
(`jest.config.js:50-55`).

`test/unit/lib/ads/coproduct.test.ts` already covers the result type (23 cases);
`either.test.ts` adds 3 confirming the alias produces real `Left`/`Right` and keeps the full
behaviour.

`groq.test.ts` covers the composition root (11 cases). Two carry the design rather than the code:

- `run` is still callable after `.and().order().slice().select()` — without the `GroqBuilder`
  signature redeclarations this fails to compile, so the test is what keeps them honest.
- `groq()` builds at run time, `groq.composite()` snapshots at call time — asserted as a matched
  pair so the difference is pinned rather than folklore.

## Why `examples.ts` exists

`src/infrastructure/sanity/examples/usage.ts` and `src/lib/sanity/decorators/examples.ts` set the
precedent: exported, type-checked, untested usage files that document an API by compiling against
it.

For this work it was not decoration. Writing it broke the build, and that break was the
`QueryRunner` variance flaw in §3 — an API that could not be faked without `as any`. Unit tests had
already been written *around* the flaw with casts. JSDoc `@example` blocks would not have caught it
either, since they are not compiled.

For an API with zero production call sites, a compile-checked example is the only thing that
exercises its ergonomics. It covers: single query with `fold` error handling, `groq.composite()`
pagination with `recover`, chained `map` for count aggregation, `isRight()` narrowing, a shared
injected runner, a test-runner factory, and the free-function `run(composite({...}))` path retained
to prove it still works.

## Verification

```bash
r mcs npx jest test/unit/lib
r mcs npx tsc --noEmit          # no build step exists; this is a type-check only
npx prettier --check src/lib
```

Then one real round-trip, in an app that has `initializeService({ sanityConfig })` already called
(mcs has no standalone runtime entrypoint):

```ts
const result = await groq()
  .and(Filters.type('song'))
  .select('_id', 'title')
  .slice(0, 3)
  .run<Song[]>()

result.fold(
  (err) => console.error(`${err.name}: ${err.message}`),
  (docs) => console.log(docs?.length ?? 0)
)
```

Result as implemented: `npm test` passes 1223 across 75 suites, `tsc --noEmit` is clean, and
`prettier --check` is clean on every new file.

## Divergence from the PHP plan

`musora-platform-backend` has **no** counterpart implemented — `app/Structure/Algebraic/` holds
only `Monoid.php` and `Semigroup.php`, and `app/Modules/Content/QueryBuilder/` has `Groq.php`,
`Filters.php`, monoids and enums but no execution layer, no `Result`, no executor contract. Any
"mirror the PHP structure" argument is therefore mirroring an unimplemented proposal, not shipped
code. This plan follows what mcs already has instead; if mpb ever lands its own version, parity can
be argued then with two real implementations in view.

## Out of scope

- **Flipping `tsconfig` `strict`** — noted above; the ADT is weaker without it.
- **GROQ params (`$foo`).** `SanityQuery { query, params }` is already threaded through and
  `FetchQueryExecutor.ts:64` already forces POST when params are present. Nothing passes params
  today and the builder has no param bag; adding one is a separate change.
- **Escaping in `Filters.titleMatch` / `Filters.searchMatch`** — flagged in §4, needs its own
  investigation and fix.
- **Migrating existing call sites** off interpolation, and the missing decorator behaviour that
  such a migration would first have to solve.
- **Retries / caching** — neither exists on the `SanityClient` path today.
- **Deleting the unreachable `return null` / `return []`** in `SanityClient.ts:37,52,67`. Real dead
  code and worth removing, but a separate cleanup with its own test implications.
- **`either.ts` and `maybe.ts`**, left behind on `chore/ads-structures`: `Either`'s inherited
  statics return `Coproduct`, so no `Either` can be constructed; `Maybe.of` is truthiness-based, so
  `Maybe.of(0)` yields `None`. Both need fixing before they are worth porting.
- **Dead dependencies** `@sanity/client@^5.4.2` and `groqd@^0.15.12` — in `dependencies`, zero
  imports anywhere in `src/` or `test/`. Flagged because `groqd` is literally a GROQ query builder
  that someone once intended to use.
- Pre-existing builder defects left alone: `first()` uses `this` (`query.ts:112`), the `order`
  monoid re-wraps rather than accumulating (`query.ts:52`), `_state()` returns the live mutable
  state with no defensive copy (`query.ts:156`), and the builder is mutable so it cannot be forked.
