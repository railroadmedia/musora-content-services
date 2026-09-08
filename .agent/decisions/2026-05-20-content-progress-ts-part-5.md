---
date: 2026-05-20
branch: refactor/content-progress-ts-part-5
pr: https://github.com/railroadmedia/musora-content-services/pull/981
status: open
tags: [[chore]]
related: [[2026-05-19-content-progress-ts-part-2]]
---

# Extract progress mutations and learning-path duplication guard

## Context

With the read path (`state.ts`, `collections.ts`), shared types, bubble/trickle logic (`internal/bubble.ts`), and query helpers (`internal/queries.ts`) already extracted in earlier parts of the refactor, the write path remained in the legacy `contentProgress.js`. All mutation operations (`save`, `setStatus`, `setStatusMany`, `markCompleted`, `markStarted`, `reset`) needed to move into the typed `progress/` module to complete the decomposition and enable direct test coverage.

## Decision

Introduced two new files:

- `src/services/progress/mutations.ts` — owns all write operations. `save` handles offline/online paths, filters negative-progress writes, computes bubble/trickle, and delegates LP completion actions. `setStatus`/`setStatusMany`/`reset` follow the same shape. Public `mark*` aliases provide a stable call surface. A private `requestPush` helper centralises the skipPush guard pattern.
- `src/services/progress/internal/learning-path.ts` — extracts `filterOutLearningPathsForDuplication`, the rule that prevents the LP root record from being written back as an a-la-carte record. Isolating it makes the invariant visible and independently testable.

Test coverage added:
- `test/integration/progress/mutations.test.ts` — integration tests against the in-memory WatermelonDB harness covering all public mutation functions and key scenarios (higher/lower/equal progress, skipBubbleTrickle, etc.)
- `test/unit/services/progress-internal/learning-path.test.ts` — unit tests for the LP duplication filter covering non-LP passthrough, LP root exclusion, and string-key coercion

## Alternatives Considered

Keeping mutations in `contentProgress.js` until the full JS→TS migration is complete was considered but rejected. The write path is high-risk and untested; extracting it into TypeScript now lets us add direct coverage and enforce types on the critical save/bubble interaction.

## Process Notes

`filterOutLearningPathsForDuplication` uses `Number(id)` on string keys from `Object.entries` to match the numeric `collection.id`. A dedicated unit test documents and guards this coercion.

## Consequences

- `Progress.*` namespace now covers both the read and write path; callers can import from `src/services/progress` for all operations
- The write path has direct integration test coverage for the first time
- `contentProgress.js` mutation functions can be deprecated and removed in a follow-up once consumers are migrated
