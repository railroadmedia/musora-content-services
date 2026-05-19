---
date: 2026-05-19
branch: refactor/content-progress-ts-part-2
pr: https://github.com/railroadmedia/musora-content-services/pull/978
status: open
tags: [[chore]]
---

# Split progress module into typed sub-modules with Progress namespace

## Context

`src/services/progress/index.ts` started as a flat file during the initial migration of `contentProgress.js` to TypeScript. As the migration continued it became clear the file would grow significantly, mixing query helpers, read operations, collection queries, and shared types. Naming also conflicted with the legacy JS exports still living in `contentProgress.js` during the transition.

## Decision

Split `progress/index.ts` into focused sub-modules:

- `state.ts` — point queries for progress state, playback position, last interacted
- `collections.ts` — bulk queries (allStarted, allCompleted, allStartedOrCompleted)
- `types.ts` — shared interfaces (GetAllQueryOptions, QueryMetadata, StartedOrCompletedOptions)
- `internal/queries.ts` — private DB helpers (getById, getByIds, getByRecordIds)

`index.ts` becomes a 5-line file that spreads both modules into a `Progress` namespace object:

```ts
export const Progress = { ...state, ...collections }
```

**Naming convention: nouns for reads, verbs for writes.**
Query functions drop their `get`/`find`/`getAll` prefixes since the namespace provides context (`Progress.state`, `Progress.allStarted`). Write operations not yet migrated will keep verb names when they land (`Progress.recordWatchSession`, `Progress.markCompleted`).

`resumeTimeByIds` was renamed to `playbackPositionByIds` — `resumeTime` read as a verb phrase in camelCase and was semantically ambiguous.

`navigate-to.ts` updated to consume `Progress.*` instead of named imports from the old flat index.

## Alternatives Considered

**Drop `get` prefix only (standalone names):** Rejected because `findIncompleteLesson` has a `find` prefix with semantic meaning (sync local search, not a DB fetch). Mixing bare nouns with `find*` names produces an inconsistent surface. The namespace approach sidesteps the verb question entirely.

**Nested read/write namespace (`Progress.get.*` / `Progress.set.*`):** Cleaner separation on paper but adds nesting for what is currently a read-only module. The simpler convention (nouns=reads, verbs=writes in flat namespace) was chosen to avoid premature structure.

## Process Notes

- `getByIds` and `getById` in `internal/queries.ts` originally had `collection` as the second parameter. The user's linter moved it to last as an optional param — this required updating all call sites in `state.ts` and cascading arg-order fixes in navigate-to.ts and tests.
- LSP diagnostics repeatedly fired false positives after the param reorder, claiming `string` was not assignable to `CollectionParameter`. `npx tsc --noEmit` was consistently the source of truth — all those diagnostics were stale cache.
- `findIncompleteLesson` param order was changed by the linter to `(progressOnItems, contentType, currentContentId?)` — both `navigate-to.ts` and the test file required arg-order updates.

## Consequences

- External callers import `Progress` and call `Progress.state(id)`, `Progress.allStarted()`, etc. — no ambiguity with `contentProgress.js` exports during the remaining migration
- Write operations remain in `contentProgress.js` until a follow-up PR migrates them into the `Progress` namespace with verb names
- The `internal/` directory convention signals private helpers not intended for direct import outside the progress module
