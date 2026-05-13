import { initializeTestDB } from '../initializeTestDB'
import db from '../../../src/services/sync/repository-proxy'

jest.mock('../../../src/services/sanity.js', () => ({
  ...jest.requireActual('../../../src/services/sanity.js'),
  fetchShows: jest.fn(),
  fetchByRailContentIds: jest.fn(),
}))
jest.mock('../../../src/services/contentAggregator.js', () => ({
  addContextToContent: jest.fn(),
}))
jest.mock('../../../src/services/content-org/learning-paths.ts', () =>
  require('../content-progress/__mocks__/mocks').mockLearningPaths(),
)
jest.mock('../../../src/services/awards/internal/content-progress-observer', () =>
  require('../content-progress/__mocks__/mocks').mockContentProgressObserver(),
)
jest.mock('../../../src/services/progress-events', () =>
  require('../content-progress/__mocks__/mocks').mockProgressEvents(),
)

import {
  processContentItem,
  getCompletedChildren,
} from '../../../src/services/progress-row/rows/content-card.js'
import { addContextToContent } from '../../../src/services/contentAggregator.js'

const lessonMeta = { brand: 'drumeo', type: 'lesson', parent_id: 0 }

initializeTestDB()

describe('getCompletedChildren', () => {
  describe('show contentType', () => {
    test('counts completed shows from addContextToContent result', async () => {
      ;(addContextToContent as jest.Mock).mockResolvedValue([
        { id: 1, progressStatus: 'completed' },
        { id: 2, progressStatus: 'started' },
        { id: 3, progressStatus: 'completed' },
        { id: 4, progressStatus: 'not-started' },
      ])
      const content = { type: 'boot-camp', brand: 'drumeo' }
      const result = await getCompletedChildren(content, 'show')
      expect(result).toEqual({ completedChildren: 2, allChildren: 4 })
    })

    test('returns zero counts when no shows returned', async () => {
      ;(addContextToContent as jest.Mock).mockResolvedValue([])
      const content = { type: 'boot-camp', brand: 'drumeo' }
      const result = await getCompletedChildren(content, 'show')
      expect(result).toEqual({ completedChildren: 0, allChildren: 0 })
    })

    test('returns zero completed when no shows have completed status', async () => {
      ;(addContextToContent as jest.Mock).mockResolvedValue([
        { id: 1, progressStatus: 'started' },
        { id: 2, progressStatus: 'not-started' },
      ])
      const content = { type: 'boot-camp', brand: 'drumeo' }
      const result = await getCompletedChildren(content, 'show')
      expect(result).toEqual({ completedChildren: 0, allChildren: 2 })
    })
  })

  describe('non-show with children', () => {
    test('counts completed children from real DB progress', async () => {
      await db.contentProgress.recordProgress(101, null, 100, lessonMeta, undefined, { skipPush: true })
      await db.contentProgress.recordProgress(102, null, 30, lessonMeta, undefined, { skipPush: true })
      await db.contentProgress.recordProgress(103, null, 100, lessonMeta, undefined, { skipPush: true })

      const content = {
        type: 'course',
        children: [{ id: 101 }, { id: 102 }, { id: 103 }],
      }
      const result = await getCompletedChildren(content, 'course')
      expect(result).toEqual({ completedChildren: 2, allChildren: 3 })
    })

    test('recursively flattens nested children to leaf ids', async () => {
      await db.contentProgress.recordProgress(201, null, 100, lessonMeta, undefined, { skipPush: true })
      await db.contentProgress.recordProgress(202, null, 100, lessonMeta, undefined, { skipPush: true })
      await db.contentProgress.recordProgress(203, null, 50, lessonMeta, undefined, { skipPush: true })

      const content = {
        type: 'course',
        children: [
          { id: 201 },
          {
            id: 999,
            children: [{ id: 202 }, { id: 203 }],
          },
        ],
      }
      const result = await getCompletedChildren(content, 'course')
      expect(result).toEqual({ completedChildren: 2, allChildren: 3 })
    })

    test('returns zero when no children have progress recorded', async () => {
      const content = {
        type: 'course',
        children: [{ id: 901 }, { id: 902 }],
      }
      const result = await getCompletedChildren(content, 'course')
      expect(result).toEqual({ completedChildren: 0, allChildren: 2 })
    })
  })

  describe('non-show without children', () => {
    test('returns zero counts when children is undefined', async () => {
      const content = { type: 'song' }
      const result = await getCompletedChildren(content, 'transcription')
      expect(result).toEqual({ completedChildren: 0, allChildren: 0 })
    })

    test('returns zero counts when children is empty array', async () => {
      const content = { type: 'song', children: [] }
      const result = await getCompletedChildren(content, 'transcription')
      expect(result).toEqual({ completedChildren: 0, allChildren: 0 })
    })
  })
})

describe('processContentItem', () => {
  test('returns correctly shaped object for a song with no children', async () => {
    const content = {
      id: 500,
      type: 'song',
      brand: 'drumeo',
      title: 'Test Song',
      thumbnail: 'thumb.jpg',
      progressPercentage: 40,
      progressStatus: 'started',
      progressTimestamp: 1700000000,
      difficulty_string: 'Beginner',
      artist_name: 'The Band',
      slug: 'test-song',
      navigateTo: 'child-slug',
    }
    const result = await processContentItem(content)
    expect(result).toMatchObject({
      id: 500,
      progressType: 'content',
      header: 'transcription',
      pinned: false,
      progressTimestamp: 1700000000,
      body: {
        progressPercent: 40,
        thumbnail: 'thumb.jpg',
        title: 'Test Song',
        isLive: false,
        brand: 'drumeo',
        badge: null,
        badge_rear: null,
        badge_logo: null,
        badge_template: null,
        badge_template_rear: null,
        isLocked: false,
        subtitle: 'Beginner • The Band',
      },
      cta: {
        text: 'Continue',
        action: {
          type: 'song',
          brand: 'drumeo',
          id: 500,
          slug: 'test-song',
          child: 'child-slug',
        },
      },
    })
  })

  test('sets progressPercent to undefined when isLive=true', async () => {
    const content = {
      id: 1,
      type: 'song',
      brand: 'drumeo',
      progressPercentage: 80,
      isLive: true,
    }
    const result = await processContentItem(content)
    expect(result.body.progressPercent).toBeUndefined()
    expect(result.body.isLive).toBe(true)
  })

  test('isLive defaults to false when missing', async () => {
    const content = { id: 2, type: 'song', brand: 'drumeo', progressPercentage: 50 }
    const result = await processContentItem(content)
    expect(result.body.isLive).toBe(false)
    expect(result.body.progressPercent).toBe(50)
  })

  test('pinned defaults to false when missing', async () => {
    const content = { id: 3, type: 'song', brand: 'drumeo' }
    const result = await processContentItem(content)
    expect(result.pinned).toBe(false)
  })

  test('pinned reflects content.pinned when set', async () => {
    const content = { id: 4, type: 'song', brand: 'drumeo', pinned: true }
    const result = await processContentItem(content)
    expect(result.pinned).toBe(true)
  })

  test('isLocked is false when need_access is missing', async () => {
    const content = { id: 5, type: 'song', brand: 'drumeo' }
    const result = await processContentItem(content)
    expect(result.body.isLocked).toBe(false)
  })

  test('isLocked is true when need_access is true', async () => {
    const content = { id: 6, type: 'song', brand: 'drumeo', need_access: true }
    const result = await processContentItem(content)
    expect(result.body.isLocked).toBe(true)
  })

  test('passes through badge fields when set', async () => {
    const content = {
      id: 7,
      type: 'song',
      brand: 'drumeo',
      badge: 'badge.png',
      badge_rear: 'badge-rear.png',
      badge_logo: 'logo.png',
      badge_template: 'tpl',
      badge_template_rear: 'tpl-rear',
    }
    const result = await processContentItem(content)
    expect(result.body).toMatchObject({
      badge: 'badge.png',
      badge_rear: 'badge-rear.png',
      badge_logo: 'logo.png',
      badge_template: 'tpl',
      badge_template_rear: 'tpl-rear',
    })
  })

  test('populates completed_children/all_children for course with children', async () => {
    await db.contentProgress.recordProgress(701, null, 100, lessonMeta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(702, null, 100, lessonMeta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(703, null, 25, lessonMeta, undefined, { skipPush: true })

    const content: any = {
      id: 700,
      type: 'course',
      brand: 'drumeo',
      children: [{ id: 701 }, { id: 702 }, { id: 703 }],
    }
    const result = await processContentItem(content)
    expect(content.completed_children).toBe(2)
    expect(content.all_children).toBe(3)
    expect(result.body.subtitle).toBe('2 of 3 Lessons Complete')
  })

  test('uses contentType from getFormattedType in header and cta resolution', async () => {
    const content = {
      id: 8,
      type: 'guided-course',
      brand: 'drumeo',
      progressStatus: 'not-started',
    }
    const result = await processContentItem(content)
    expect(result.header).toBe('guided course')
    expect(result.cta.text).toBe('Start Course')
  })

  test('cta action mirrors content identity fields', async () => {
    const content = {
      id: 9,
      type: 'song',
      brand: 'pianote',
      slug: 'my-slug',
      navigateTo: 'next-child',
    }
    const result = await processContentItem(content)
    expect(result.cta.action).toEqual({
      type: 'song',
      brand: 'pianote',
      id: 9,
      slug: 'my-slug',
      child: 'next-child',
    })
  })
})
