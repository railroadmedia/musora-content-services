# Code Review Guideline

The standard `/pls-review` reviews changes against. This file is the source of truth — edit it and the review changes with it.

Scope is design quality: SOLID, guard clauses and nesting depth, conditional simplification, async correctness, module and layer boundaries, public API surface, React Native compatibility, and the Refactoring Guru smell catalog. Formatting is Prettier's job; neither it nor anything the TypeScript compiler already rejects belongs in a review comment.

`tsconfig.json` sets `strict: false`, so null and undefined handling is **not** covered by tooling here. That gap is the reviewer's, and the TS family below names it.

## Severity

| Tier         | Meaning                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `BLOCKER`    | A real defect, or a boundary violation that will force a rewrite later. |
| `SHOULD-FIX` | A genuine design problem, safe to fix within this change.               |
| `NIT`        | Preference. Only reported if a rule below names it.                     |

A break in the package's published surface (API family) is a `BLOCKER` regardless of how small the edit looks: MusoraApp and musora-platform-frontend both consume it.

## SRP — Single Responsibility

**SRP-1** A service function is I/O _or_ transformation, not both. Fetching, mapping the response into domain shapes, and caching are three reasons to change; a function doing all three has three.

**SRP-2** A function has one reason to change. Smell: a name containing "and", or a body that splits into unrelated stanzas separated by blank lines.

**SRP-3** A module owns one domain concept. Smell: unrelated exports sharing a file because one screen happened to need both. `src/services/<domain>/` directories exist so this split has somewhere to land.

**SRP-4** A file growing past a few hundred lines is a signal, not a rule. Report it only when there is an extractable seam you can name.

**SRP-5** GROQ construction is its own responsibility. A function that builds a query string, executes it, and post-processes the result should hand query building to `FilterBuilder` / `src/lib/sanity/`.

## OCP — Open/Closed

**OCP-1** New content types, brands, or variants arrive through a lookup keyed by the discriminant — not by appending another branch to an `if`/`switch` on `contentType`, `brand`, or a status string. Smell: a conditional chain that grew in this change.

**OCP-2** `src/contentTypeConfig.js` is the extension point for content-type behaviour, and `src/lib/brands.ts` for brand behaviour. A new per-type field mapping or per-brand value belongs in the config, not in a branch at the call site.

**OCP-3** In the sync layer, new behaviour arrives as a registered strategy or repository, not as a branch inside `manager.ts`.

## LSP — Liskov Substitution

**LSP-1** Anything substituted for another honours the same contract: same argument semantics, same return shape, no silently narrower accepted input.

**LSP-2** Implementations of an interface — `RequestExecutor`, `QueryExecutor`, `HeaderProvider`, `ConfigProvider` — are interchangeable. An implementation that throws where the default returns, or returns `undefined` where the interface promises a value, is not.

**LSP-3** A subclass override must not no-op or throw where the base promised behaviour. Applies directly to `SyncRepository`, `SyncStore`, `BaseModel`, and the strategy base classes.

**LSP-4** A wrapper forwards what it doesn't handle. Smell: a wrapper accepting a subset of options and quietly discarding the rest.

## ISP — Interface Segregation

**ISP-1** Don't force callers to supply what they don't need. Smell: an options object whose fields go unused at most call sites; a function taking a whole content entity when it needs one `railcontentId`.

**ISP-2** Split fat option bags. A function with eight optional parameters is usually two functions, or one plus a builder.

**ISP-3** A service module accumulating unrelated exports should split along the seams its callers actually use.

**ISP-4** A shared type that grows a field for one caller has become two types. Prefer a narrow parameter type per function over widening a common one.

## DIP — Dependency Inversion

**DIP-1** Domain code reaches the network through `src/infrastructure/http/HttpClient` or the Sanity client — never `fetch` directly.

**DIP-2** Collaborators arrive by injection. `HttpClient`'s constructor — an optional argument per collaborator, defaulted to the concrete implementation — is the house pattern to copy. The practical test: can the unit be tested without `jest.spyOn` on a module?

**DIP-3** `globalConfig` is read at the edges, not threaded deep into pure logic. A calculation that reads config directly cannot be tested without `initializeTestService()`; take the value as an argument instead.

**DIP-4** A high-level module must not import a low-level concrete detail to reach across a boundary — see the BOUND table.

## NEST — Never Nesting

Depth is the cost. Every level of indentation is another piece of state the reader holds while scanning.

**NEST-1** Two levels of indentation inside a function is the ceiling. A third is the signal to restructure, not to reformat.

**NEST-2** Prefer the guard clause — see GUARD, which is the primary tool for this whole family.

**NEST-3** Extract, don't indent. When a nested block has a name you can say out loud, it is a function.

**NEST-4** No nested ternaries. One level is fine; a ternary inside a ternary becomes a lookup map or an early return.

**NEST-5** No `else` after a block that returns. It is a level of nesting with no purpose.

**NEST-6** A `try` block wrapping an entire function body is nesting too. Wrap the call that can throw, not the whole function.

## GUARD — Guard Clauses

_Replace Nested Conditional with Guard Clauses._ The single highest-value refactoring in this guideline: it is how NEST is achieved in practice.

**GUARD-1** Invert the condition and leave early — `return`, `throw`, or `continue` — so the happy path stays unindented at the left margin.

```ts
// no
if (user) {
  if (user.isActive) {
    doThing(user)
  }
}

// yes
if (!user?.isActive) return
doThing(user)
```

**GUARD-2** Preconditions go at the top, in one block: null and empty checks, missing config, permission checks. Then the real work, uninterrupted.

**GUARD-3** One guard per reason. Don't `&&` unrelated preconditions together — the reader loses which one failed. (Conditions sharing a _single_ reason should be combined; see COND-2.)

**GUARD-4** A guard exits. One that sets a flag and keeps going is a control flag, not a guard — remove it (COND-4).

**GUARD-5** Guard the empty collection before the loop, not inside it. An early `if (!ids.length) return []` beats a conditional wrapped around the body.

## COND — Simplifying Conditionals and Expressions

**COND-1** _Decompose Conditional._ A condition you have to parse gets a name — a `const` with an intention-revealing name, or a small predicate function.

**COND-2** _Consolidate Conditional Expression._ Several checks leading to one outcome collapse into one named condition.

**COND-3** _Consolidate Duplicate Conditional Fragments._ Code identical in every branch moves out of the conditional.

**COND-4** _Remove Control Flag._ A boolean steering a loop or a sequence of `if`s is a `return` or a `break` wearing a disguise.

**COND-5** _Replace Magic Number with Symbolic Constant._ Applies to magic strings too — brand keys, content types, permission ids, status values. `src/constants/` and `src/contentTypeConfig.js` are where they live.

**COND-6** _Extract Variable_ / _Replace Temp with Query._ Name the intermediate expression rather than repeating it or commenting it.

**COND-7** _Introduce Null Object._ A default value or an empty-state object beats scattering the same null check across every call site.

**COND-8** _Separate Query from Modifier._ A function that returns a value shouldn't also mutate state or write to storage. Smell: a `getX()` that lazily populates a cache — if that is deliberate, the name says so.

## ASYNC — Asynchronous Correctness

This package is almost entirely async I/O, and none of these are caught by tooling.

**ASYNC-1** Independent awaits don't run in sequence. `await` inside a `for` over independent items is `Promise.all` (or a batched fetch) unless the sequencing is deliberate — say so in the name or a `why` comment if it is.

**ASYNC-2** No floating promises. An un-awaited call either gets `await`, or an explicit `.catch()` and a name that says it is fire-and-forget.

**ASYNC-3** No swallowed errors. An empty `catch`, or one that returns `null` without logging, turns a broken request into a silent empty screen. Catch to convert the error into a domain result, or let it propagate.

**ASYNC-4** Don't catch what you can't handle. A `try/catch` that logs and rethrows unchanged adds nesting and nothing else.

**ASYNC-5** Shared mutable state across awaits is a race. Cache writes, in-flight maps, and `let` accumulators read before an `await` and written after it must be re-checked — `HttpClient`'s in-flight GET map is the pattern for deduping concurrent identical requests.

**ASYNC-6** Timers and subscriptions are cleaned up. Every `setInterval`, `setTimeout` retry, and event subscription has a matching clear/unsubscribe on the path that ends its lifetime.

**ASYNC-7** Cross-`await` config reads. `globalConfig` can be reinitialised between awaits; capture what you need before the first `await` rather than reading it again after.

## TS — Types as Design

`strict: false` means the compiler will not catch these.

**TS-1** Optional and possibly-absent values are handled explicitly. Indexing into an API response without `?.` or a guard is a defect, not a style choice — the compiler is not checking.

**TS-2** No `any` on an exported signature. Internal `any` is a smell; `any` in the package's public surface propagates into two consuming apps.

**TS-3** Prefer a discriminated union over a boolean flag pair or a type-code string. Overlaps SMELL-3; cite one.

**TS-4** New code in a `.ts` file stays typed. Adding an untyped `.js` helper next to a typed module to dodge a type is a finding.

**TS-5** Type-only imports use `import type` so they don't survive into the emitted module graph.

## BOUND — Module and Layer Boundaries

The directory layout _is_ the model. Dependencies point downward.

**BOUND-1** Layer directions:

| Layer                     | May import                                                | Must never import                     |
| ------------------------- | --------------------------------------------------------- | ------------------------------------- |
| `src/lib/`                | `src/lib`, `src/constants`, `services/config` (see B-2)   | domain services, `services/sync`      |
| `src/infrastructure/`     | `src/lib`, `src/constants`, `services/config` (see B-2)   | domain services, `services/sync`      |
| `src/services/<domain>/`  | `lib`, `infrastructure`, `constants`, `sync`, sibling domains' public modules | another domain's `internal/` |
| `src/services/sync/`      | `lib`, `infrastructure`                                    | domain services                       |

**BOUND-2** `globalConfig` from `src/services/config` is the one sanctioned upward import for `lib/` and `infrastructure/` — it is configuration, not domain. Anything else from `services/` in those layers is a finding.

**BOUND-3** `internal/` is private to its domain. `src/services/awards/internal/` and `src/services/progress/internal/` are reachable only from their own domain; a cross-domain import of one is a modelling problem and the import is the symptom.

**BOUND-4** Cross-domain communication uses the domain's public module or its `index.ts` barrel — never a deep path into another domain's file tree.

**BOUND-5** Two domains needing each other's internals means the concept belongs in a third place: `src/lib/` if it is pure, `src/constants/` if it is data. Prefer duplication over widening a shared module with domain vocabulary.

**BOUND-6** `src/services/sync/` is infrastructure for offline-first storage, not a domain. It exposes models, repositories, and strategies; it must not import a domain service to make a decision. Domain services calling into sync repositories is the correct direction.

**BOUND-7** Ubiquitous language. Names inside a domain match that domain's vocabulary and stay consistent across its files. Conversely `src/lib/` and `src/infrastructure/` carry no domain vocabulary at all — a name there that means something to the business belongs in a service.

## API — Published Surface

`src/index.js` and `src/index.d.ts` are generated by `npm run build-index`, which harvests every `export function` / `export async function` under `src/services/` (minus `.indexignore` directories and each file's `excludeFromGeneratedIndex` list).

**API-1** Exporting a function from `src/services/` publishes it. A helper that is not meant to be public stays unexported, moves to `internal/`, or goes in `excludeFromGeneratedIndex`.

**API-2** Renaming, removing, or narrowing an already-published function is a breaking change for MusoraApp and musora-platform-frontend. Add an optional parameter or a new function; don't reshape the existing one.

**API-3** Changes to exports mean `npm run build-index` runs in the same change. A diff that adds a public function without the regenerated index is incomplete.

**API-4** A new sync model is only half-added without the full registration path — model, repository, schema, `store-configs.ts`, `models/index.ts` — plus the note that the mobile team must register it in MusoraApp's `SyncManager.ts`.

**API-5** Types exported alongside a function are part of the surface too. A widened return type is a breaking change for typed consumers.

## RN — React Native Compatibility

Every change ships to MusoraApp as well as the web.

**RN-1** No browser-only globals: `window`, `document`, `sessionStorage`, `FileReader`, `Blob`, `URL.createObjectURL`, `canvas`, `Image`, DOM APIs. `navigator.onLine` is the one exception.

**RN-2** No Node built-ins: `fs`, `path`, `os`, `crypto`, `Buffer`, `process.env`.

**RN-3** Storage goes through `globalConfig.localStorage`, and the `isMA` branch is honoured — AsyncStorage is async, web `localStorage` is not:

```js
const value = globalConfig.isMA
  ? await globalConfig.localStorage.getItem(key)
  : globalConfig.localStorage.getItem(key)
```

Reading `globalConfig.localStorage` without that branch returns a `Promise` on mobile and silently produces garbage. `BLOCKER`.

**RN-4** New dependencies must work under Metro. A package pulling in Node built-ins or requiring a bundler plugin is a finding.

## DOC — Comments and JSDoc

House rules from `CLAUDE.md`; they are review findings, not preferences.

**DOC-1** No comment that restates what the code does. Extract a named constant or function instead — an intention-revealing name is the fix, every time.

**DOC-2** No comments about history, previous behaviour, or what a change replaced. Git holds that.

**DOC-3** A comment explaining _why_ — a non-obvious constraint, an upstream quirk, a deliberate ordering — is correct and stays.

**DOC-4** JSDoc carries tags only: `@param`, `@returns`, `@throws`, `@example`, types. No prose paragraph before the first tag, no empty `* ` opening line, no repeating what the function name already says.

**DOC-5** Commented-out code is deleted. Same finding as SMELL-12.

## SMELL — Refactoring Guru Catalog

A vocabulary for naming findings precisely — **not a checklist to run top to bottom**. A smell is reportable only when it also clears the guardrails: a changed line, a concrete consequence, a real cost. Name the refactoring that fixes it, not just the smell.

**Bloaters**

- **SMELL-1** _Long Method_ → Extract Method.
- **SMELL-2** _Large Class_ → Extract Class. Here that is a god service module, repository, or manager.
- **SMELL-3** _Primitive Obsession_ → Replace Data Value with Object, or Replace Type Code with a union. Smell: bare strings standing in for a brand, status, or content type.
- **SMELL-4** _Long Parameter List_ → Introduce Parameter Object.
- **SMELL-5** _Data Clumps_ → the same three or four values travelling together are a type.

**Object-Orientation Abusers**

- **SMELL-6** _Switch Statements_ → replace with a lookup map or polymorphism. Same finding as OCP-1; cite one, not both.
- **SMELL-7** _Temporary Field_ → an instance field meaningful only during one operation belongs inside it. Common in the sync classes.
- **SMELL-8** _Alternative Classes with Different Interfaces_ → two services or repositories doing the same job with different shapes should be unified.

**Change Preventers**

- **SMELL-9** _Divergent Change_ → one file edited for unrelated reasons. Extract Class. Overlaps SRP-2; cite one.
- **SMELL-10** _Shotgun Surgery_ → one conceptual change forcing edits across many files. Move Method or Move Field to put the behaviour where the data is.

**Dispensables**

- **SMELL-11** _Duplicate Code_ → Extract Function. **Bounded by BOUND-5:** extract _within_ a domain; across domains, either move it to `lib/`, or duplicate.
- **SMELL-12** _Dead Code_ → delete it. Commented-out blocks included.
- **SMELL-13** _Speculative Generality_ → an abstraction with one caller and no second use in sight. Delete it.
- **SMELL-14** _Comments_ used to explain confusing code → DOC-1 is the sharper rule; cite that.
- **SMELL-15** _Lazy Class_ → Inline. A wrapper adding nothing but a layer.

**Couplers**

- **SMELL-16** _Feature Envy_ → a function more interested in another module's data than its own. Move Function.
- **SMELL-17** _Inappropriate Intimacy_ → reaching into another unit's internals. Across domains this is BOUND-3; cite that instead.
- **SMELL-18** _Message Chains_ → `a.b.c.d`. Hide Delegate. Especially sharp here because `strict: false` won't warn when a link is undefined (TS-1).
- **SMELL-19** _Middle Man_ → a module that only re-exports and forwards. Remove Middle Man — but a deliberate barrel `index.ts` is a boundary, not a middle man (BOUND-4).

**Applicability notes.** The sync layer genuinely uses class inheritance (`BaseModel`, `SyncRepository`, `SyncStore`, strategy bases), so Pull Up / Push Down and Extract Superclass do apply _there_ and nowhere else — the rest of the codebase is modules and functions. _Refused Bequest_ overlaps LSP-3; cite LSP-3. Excluded outright: _Data Class_ — TypeScript interfaces, DTOs, and the generated Sanity types are legitimate — and the Java-flavoured techniques (Self Encapsulate Field, Replace Error Code with Exception).

## Reconciling rules that pull against each other

**Duplicate Code vs. BOUND-5.** Inside one domain, extract the duplicate. Across two domains, move it to `src/lib/` if it is genuinely generic, and otherwise duplicate it — coupling two domains is the more expensive mistake.

**Long Parameter List vs. ISP-1.** _Preserve Whole Object_ when the callee genuinely uses several fields of the entity. Pass the single value when it uses one. The test is what the callee reads, not what is convenient at the call site.

**DIP-2 vs. Speculative Generality.** Introduce an interface when there is a second implementation or a test that needs one. A one-implementation interface added "for testability" with no test using it is SMELL-13.

**ASYNC-1 vs. rate limits.** Parallelising is the default, but a loop that is sequential to respect an upstream limit or a required ordering is correct — check for a stated reason before reporting it.

**API-2 vs. every other rule.** A design improvement that changes a published signature is not worth the break. Deprecate and add; don't reshape.

## Guardrails

These matter as much as the rules. The characteristic failure of a design review is demanding structure nobody needs.

- **One rule per finding.** Several rules often describe the same defect — OCP-1 and SMELL-6, SRP-2 and SMELL-9, BOUND-3 and SMELL-17, DOC-1 and SMELL-14, TS-3 and SMELL-3. Pick the most specific and report it once.
- **Every finding is evidenced.** It must carry the changed line it applies to, the rule ID it violates, and the concrete consequence. Anything that cannot carry all three is not reported.
- **Zero findings is a correct result.** There is no quota. A clean change gets a clean review.
- **No speculative abstraction.** The consequence has to be a bug, or a change already happening here that is made harder. "This might need to vary someday" is not a finding.
- **Two occurrences is not a pattern.** Don't invoke OCP on the first `if`.
- **Don't nitpick the small stuff the rules deliberately allow** — a single level of nesting, one ternary, a short helper that reads fine.
- **Stay inside the change.** No findings on lines this change didn't touch, and no pre-existing issues. This codebase has known boundary violations that predate the guideline; they are not this change's problem.
- **Skip what tooling catches.** Prettier and the TypeScript compiler run separately — but remember `strict: false` means null-safety is *not* one of those things.
- **Skip what a senior engineer wouldn't raise** in a real review.
- **Prefer the smallest fix** that resolves the violation, not the most architecturally pure one.
