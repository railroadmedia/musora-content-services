# Coverage Approach — Exclusions and Thresholds

After running the baseline (`npm test -- --coverage`) and auditing which files are actually unit-testable, we identified two categories.

---

## Guiding principle

**Exclude only pure transport/adapter layers with no business logic. Any file containing business logic — even if currently at 0% coverage — stays in the collection so the gap is visible and creates pressure to improve. Hiding low coverage by excluding files with real logic defeats the purpose of the threshold.**

This is particularly important for refactoring safety. If `content-org/learning-paths.ts` has complex progression logic and we exclude it, a refactor could silently break that logic with no coverage signal. Keeping it in at 0% is honest and motivating.

---

## Exclude from coverage collection

These files are pure I/O adapters or transport layers with no business logic:

| File | Reason |
|---|---|
| `src/services/sanity.js` | GROQ query transport layer — every function is a real HTTP call to Sanity |
| `src/services/railcontent.js` | Railcontent HTTP transport layer — thin wrappers around fetch |
| `src/services/recommendations.js` | API wrapper, no logic |
| `src/index.js` / `src/index.d.ts` | Auto-generated |
| `src/services/user/account.ts` | Pure API calls |
| `src/services/user/sessions.js` | Pure API calls |
| `src/services/user/profile.js` | Pure API calls |
| `src/services/user/management.js` | Pure API calls |
| `src/services/user/interests.js` | Pure API calls |
| `src/services/user/payments.ts` | Pure API calls |
| `src/services/user/chat.js` | Pure API calls |

---

## Keep in coverage — business logic, acknowledge low baseline

These files have real business logic and should remain in coverage collection even where current numbers are low. Low numbers here are a signal to improve, not a reason to exclude.

| File | Current Statements | Notes |
|---|---|---|
| `src/services/content.js` | 0% | Content aggregation, filtering, sorting logic |
| `src/services/contentProgress.js` | 14% | Progress calculation, bubbling, trickle logic. Low due to WatermelonDB dependency — expected to improve with TP-1192 harness |
| `src/services/contentAggregator.js` | ~18% | Content enrichment logic |
| `src/services/content-org/**` | ~13% | Enrolment, progression, completion logic for learning paths and guided courses |
| `src/services/user/notifications.js` | 69% | Notification filtering and formatting logic |
| `src/services/user/streakCalculator.ts` | 94% | Already well covered |

---

## Current baselines on well-covered unit-testable files

| Path | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `filterBuilder.js` | 81% | 80% | 76% | 85% |
| `sync/store` | 65% | 63% | 66% | 65% |
| `sync/repositories` | 54% | 59% | 49% | 55% |
| `sync/models` | 87% | 57% | 80% | 86% |
| `awards/internal` | 82% | 67% | 75% | 83% |

Global baseline after exclusions expected to be in the 60–70% range, to be confirmed once exclusions are applied.

---

## Alignment with upcoming refactoring

The coverage thresholds set here should be treated as a floor, not a ceiling. The real value comes when coverage is in place *before* major refactoring proposals are executed. As the codebase evolves — particularly around the sync layer, content fetching, and content-org — having meaningful unit test coverage established first means refactors can be validated against existing behaviour rather than discovered broken after the fact. The intent is that TP-1192 and future test work progressively raise the thresholds, so by the time significant architectural changes are proposed, the test suite is already a reliable safety net.
