---
date: 2026-07-17
branch: chore/onboarding-statuses
pr: https://github.com/railroadmedia/musora-content-services/pull/1011
status: open
tags: [[feature]]
---

# Add cross-brand onboarding status endpoint

## Context
`userOnboardingForBrand(brand)` only returns onboarding state for one brand at a time. Callers that need to know onboarding completion across all brands (e.g. Drumeo, Pianote, Guitareo, Singeo) for a user had no single call to get that.

## Decision
Added `getOnboardingStatus()` in `src/services/user/onboarding.ts`, hitting `GET /api/user-management-system/v1/users/{userId}/onboardings/status`. Returns `OnboardingStatus`: `has_completed_onboarding` plus a `brands: OnboardingBrandStatus[]` array (`brand`, `is_completed`, `completed_flow`, `completed_at`). Ran `npm run build-index` to regenerate `index.js`/`index.d.ts` so the new function is exported from the package.

## Alternatives Considered
No alternatives considered — this is additive to the existing per-brand `userOnboardingForBrand` function, not a replacement.

## Consequences
Consumers (musora-platform-frontend, MusoraApp) can now fetch all-brand onboarding status in a single request instead of looping `userOnboardingForBrand` per brand.
