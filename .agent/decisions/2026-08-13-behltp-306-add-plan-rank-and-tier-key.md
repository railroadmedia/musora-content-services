---
date: 2026-08-13
branch: feat/BEHLTP-306-add-plan-rank-and-tier-key
pr: https://github.com/railroadmedia/musora-content-services/pull/1030
status: open
tags: [[feature]]
---

# Add tier_key and rank to MCS's UpgradeProduct type

## Context
BEHLTP-306 (musora-platform-backend PR #1463, already merged) added `tier_key` and `rank` fields to the backend's `upgrade_options` response, so MusoraApp can fetch canonical plan rank from the API instead of hardcoding its own copy. While working on an unrelated ticket (TP-1307), David noted MCS's TypeScript structure hadn't been updated to match, and asked to prepare a fix on its own branch.

## Decision
Add `tier_key: string` and `rank: number | null` to MCS's `UpgradeProduct` interface (`src/services/user/memberships.ts`), matching the backend's response shape exactly. Since MCS doesn't transform/strip this data at runtime (the interface is purely a type declaration), the actual field values were already flowing through — this change only restores type safety for consumers referencing `product.tier_key`/`product.rank`.

## Alternatives Considered
No alternatives considered — this is a straightforward type-sync fix with one correct shape to match.

## Process Notes
Verified with `npx tsc --noEmit` (via the manager container, sourcing nvm explicitly since a plain `bash -lc` login shell didn't pick it up) rather than assuming a dedicated typecheck script existed — none did.

## Consequences
Consumers of `UpgradeProduct` (e.g. MusoraApp) can now reference `tier_key`/`rank` without a TypeScript error.
