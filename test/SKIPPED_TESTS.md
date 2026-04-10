# Skipped Tests Reference

This document tracks all skipped tests and why they are skipped. Tests are divided into two categories:

1. **Skipped for CI** — were passing but depend on live external services; skipped to enable clean CI runs
2. **Previously skipped — failing or unknown** — were already skipped before CI work; many confirmed failing

The goal is to eventually move all Category 1 tests into a dedicated integration/live test suite, and to triage Category 2 tests as either fixable or retired.

---

## Category 1: Skipped for CI (were passing, have external dependencies)

### `test/sanityQueryService.test.js` — Sanity CMS

All tests in this file call real Sanity GROQ queries via `initializeTestService(true)`.

| Test | Dependency |
|---|---|
| fetchSongById | Sanity |
| fetchReturning | Sanity |
| fetchLeaving | Sanity |
| fetchComingSoon | Sanity |
| fetchSanity-WithPostProcess | Sanity |
| fetchSanityPostProcess | Sanity |
| fetchByRailContentIds | Sanity |
| fetchByRailContentIds_Order | Sanity |
| fetchUpcomingNewReleases | Sanity |
| fetchLessonContent | Sanity |
| fetchAllSongsInProgress | Sanity |
| fetchNewReleases | Sanity |
| fetchAllWorkouts | Sanity |
| fetchAllInstructorField | Sanity |
| fetchAllInstructors | Sanity |
| fetchAll-CustomFields | Sanity |
| fetchRelatedLessons | Sanity |
| fetchRelatedLessons-quick-tips | Sanity |
| fetchRelatedLessons-in-rhythm | Sanity |
| getSortOrder | Sanity (describe block requires live auth) |
| fetchAll-WithProgress | Sanity |
| fetchAllFilterOptions-WithProgress | Sanity |
| fetchAll-IncludedFields | Sanity |
| fetchAll-IncludedFields-rudiment-multiple-gear | Sanity |
| fetchByReference | Sanity |
| fetchScheduledReleases | Sanity |
| fetchAll-GroupBy-Artists | Sanity |
| fetchAll-GroupBy-Instructors | Sanity |
| fetchMetadata | Sanity |
| fetchMetadata-Coach-Lessons | Sanity |
| invalidContentType | Sanity (describe block requires live auth) |
| metaDataForLessons | Sanity |
| metaDataForSongs | Sanity |
| fetchAllFilterOptionsLessons | Sanity |
| fetchAllFilterOptionsSongs | Sanity |
| fetchLiveEvent | Sanity |
| fetchRelatedLessons-pack-bundle-lessons | Sanity |
| fetchRelatedLessons-course-parts | Sanity |
| fetchRelatedLessons-song-tutorial-children | Sanity |
| fetchMetadata (second) | Sanity |

### `test/content.test.js` — Sanity CMS + Railcontent API

| Test | Dependency |
|---|---|
| getTabResults-Singles | Sanity + Railcontent |
| getTabResults-Courses | Sanity + Railcontent |
| getTabResults-Type-Explore-All | Sanity + Railcontent |

### `test/user/permissions.test.js` — Railcontent API

| Test | Dependency |
|---|---|
| fetchUserPermissions | Railcontent `fetchUserPermissionsData` |

---

## Category 2: Previously Skipped — Failing or Unknown State

These were already skipped before CI work. Status is noted where confirmed.

### `test/sanityQueryService.test.js`

| Test | Status | Failure Reason |
|---|---|---|
| fetchSongArtistCount | Unknown | — |
| fetchUpcomingEvents | Unknown | — |
| fetchLessonContent-PlayAlong-containts-array-of-videos | Unknown | — |
| fetchAllSortField | Unknown | — |
| fetchRelatedLessons-child | Unknown | — |
| fetchPackAll | Unknown | — |
| fetchAllPacks | Unknown | — |
| fetchAll-IncludedFields-multiple | Unknown | — |
| fetchAll-IncludedFields-playalong-multiple | Unknown | — |
| fetchAll-IncludedFields-coaches-multiple-focus | Unknown | — |
| fetchAll-IncludedFields-songs-multiple-instrumentless | Unknown | — |
| fetchAll-GroupBy-Genre | Unknown | — |
| fetchShowsData | Unknown | — |
| fetchShowsData-OddTimes | Unknown | — |
| fetchTopLevelParentId | Unknown | — |
| fetchHierarchy | Unknown | — |
| fetchTopLeveldrafts | Failing | Timeout (>5s) |
| fetchCommentData | Failing | `null.forEach` — Sanity returns null for content IDs |
| baseConstructor | Unknown | — |
| withOnlyFilterAvailableStatuses | Unknown | — |
| withContentStatusAndFutureScheduledContent | Unknown | — |
| withUserPermissions | Unknown | — |
| withUserPermissionsForPlusUser | Unknown | — |
| withPermissionBypass | Unknown | — |
| withPublishOnRestrictions | Unknown | — |
| fetchAllFilterOptions | Unknown | — |
| fetchAllFilterOptions-Rudiment | Unknown | — |
| fetchAllFilterOptions-PlayAlong | Unknown | — |
| fetchAllFilterOptions-Coaches | Unknown | — |
| fetchAllFilterOptions-filter-selected | Failing | `null.meta` — API returns null for filter combination |
| customBrandTypeExists | Unknown | — |
| withCommon | Unknown | — |
| fetchOtherSongVersions | Failing | 0 results — content is drafted/admin-only |
| fetchLessonsFeaturingThisContent | Failing | 0 results — content is drafted/admin-only |
| getRecommendedForYou | Failing | `SyncError: Intended user ID does not match` |
| getRecommendedForYou-SeeAll | Failing | `SyncError: Intended user ID does not match` |

### `test/content.test.js`

| Test | Status | Failure Reason |
|---|---|---|
| getTabResults-Filters | Failing | Timeout (>5s) |
| getTabResults-Type-Filter | Failing | `TypeError: null.entity` — Sanity returns null |
| getContentRows | Unknown |Sanity & pw-recommender  |
| getNewAndUpcoming | Failing | Timeout (>5s) |
| getScheduleContentRows | Failing | Timeout (>5s) |
| getSpecificScheduleContentRow | Failing | Timeout (>5s) |

### `test/contentProgress.test.js`

| Test | Status | Failure Reason |
|---|---|---|
| get-Songs-Tutorials | Unknown | Live Sanity call |
| get-Songs-Transcriptions | Unknown | Live Sanity call |
| get-Songs-Play-Alongs | Unknown | Live Sanity call |

### `test/progressRows.test.js`

| Test | Status | Failure Reason |
|---|---|---|
| check progress rows logic | Failing | Stale mock data — not a live API issue; mock data no longer reflects current data shape |

### `test/learningPaths.test.js`

| Test | Status | Failure Reason |
|---|---|---|
| learningPathCompletion | Unknown | Uses `initializeTestService(true)` — live API |
