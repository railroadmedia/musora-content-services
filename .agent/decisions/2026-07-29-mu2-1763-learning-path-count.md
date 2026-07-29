---
date: 2026-07-29
branch: chore/MU2-1763-learning-path-count
pr: https://github.com/railroadmedia/musora-content-services/pull/1021
status: open
tags: [[chore]]
related: [[2026-07-20-mu2-1724-songs-lessons-counts]]
---

# Learning path count query

## Context
Needed a way to get the published count of `learning-path-v2` content, globally or scoped to a brand, alongside the existing song/lesson counts.

## Decision
Added `fetchLearningPathCount(brand?)` in `src/services/content/counts.ts`, returning `{ total }`.
- Reuses the `Filters`/`query` builder pattern and `SanityClient.executeQuery` established by `fetchSongAndLessonCounts` in the same file, filtering on `typeIn(['learning-path-v2'])`, `statusIn(['published'])`, and `defined('railcontent_id')`.
- Kept as a separate exported interface (`LearningPathCount`) and function rather than folding into `SongAndLessonCounts`, since a learning path count is conceptually distinct from song/lesson counts.

## Alternatives Considered
No alternatives considered — single filter shape, straightforward extension of the existing file's pattern.

## Consequences
- New public function `fetchLearningPathCount` exported from `src/services/content/counts.ts`; needs `npm run build-index` to surface in the generated package index/types.
- No test coverage added.
