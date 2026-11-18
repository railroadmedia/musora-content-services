jest.mock('../../../src/infrastructure/http/HttpClient.ts', () => ({
  __esModule: true,
  GET: jest.fn(),
  POST: jest.fn(),
  HttpClient: jest.fn(),
}))
jest.mock('../../../src/services/feature-flags', () => ({
  featureFlags: { isReady: jest.fn(), refresh: jest.fn(), accessible: jest.fn() },
}))
jest.mock('../../../src/services/my-path/active-path.ts', () => ({
  fetchActiveLearningPath: jest.fn(),
  advanceActiveLearningPath: jest.fn(),
}))
jest.mock('../../../src/services/sync', () => ({
  db: { contentProgress: { getOneProgressByContentId: jest.fn() } },
}))
jest.mock('../../../src/services/sanity.js', () => ({
  fetchByRailContentId: jest.fn(),
  fetchByRailContentIds: jest.fn(),
  fetchMethodV2Structure: jest.fn(),
  fetchParentChildRelationshipsFor: jest.fn(),
  hasAnyMethodV2IntroCompleted: jest.fn(),
  devFetchAllLearningPathsAndIntroVideoIdsForDelete: jest.fn(),
}))
jest.mock('../../../src/services/contentAggregator.js', () => ({
  addContextToLearningPaths: jest.fn(),
}))
jest.mock('../../../src/services/contentProgress.js', () => ({
  contentStatusCompleted: jest.fn(),
  contentStatusCompletedMany: jest.fn(),
  contentStatusReset: jest.fn(),
  getAllCompletedByIds: jest.fn(),
  getIdsWhereLastAccessedFromMethod: jest.fn(),
  getProgressState: jest.fn(),
  resetStatus: jest.fn(),
}))

import * as HttpClient from '../../../src/infrastructure/http/HttpClient'
import { featureFlags } from '../../../src/services/feature-flags'
import { advanceActiveLearningPath, fetchActiveLearningPath } from '../../../src/services/my-path/active-path'
import { clearLearningPathCaches } from '../../../src/services/my-path/cache'
import { db } from '../../../src/services/sync'
import { fetchMethodV2Structure } from '../../../src/services/sanity.js'
import { addContextToLearningPaths } from '../../../src/services/contentAggregator.js'
import { contentStatusReset } from '../../../src/services/contentProgress.js'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'
import { onLearningPathCompletedActions } from '../../../src/services/my-path/learning-paths'

const COMPLETED_LP_ID = 100
const NEXT_LP_ID = 200
const BRAND = 'drumeo'
const NEXT_PREROLL_ID = 555
const NEXT_INTRO_VIDEO_ID = 777

const asMock = (fn: unknown) => fn as jest.Mock

const enrichedLearningPaths: Record<number, any> = {}

function givenProgressRecord(data: { content_brand?: string | null } | null) {
  asMock(db.contentProgress.getOneProgressByContentId).mockResolvedValue({ data })
}

function givenEnrichedLearningPath(id: number, fields: Record<string, unknown>) {
  enrichedLearningPaths[id] = { id, children: [], ...fields }
}

function givenMyPathFlag({ enabled, ready = true }: { enabled: boolean; ready?: boolean }) {
  asMock(featureFlags.isReady).mockReturnValue(ready)
  asMock(featureFlags.refresh).mockResolvedValue(undefined)
  asMock(featureFlags.accessible).mockReturnValue(enabled)
}

function givenActiveLearningPath(id: number | null) {
  asMock(fetchActiveLearningPath).mockResolvedValue(id === null ? null : { active_learning_path_id: id })
}

function givenAdvanceMovesTo(id: number) {
  asMock(advanceActiveLearningPath).mockResolvedValue({ active_learning_path_id: id })
}

function givenMethodPublishedOrder(ids: number[]) {
  const published_on = '2020-01-01T00:00:00Z'
  asMock(fetchMethodV2Structure).mockResolvedValue({
    learning_paths: ids.map((id) => ({ id, published_on })),
  })
}

function givenLegacyActiveLearningPath(id: number) {
  asMock(HttpClient.GET).mockResolvedValue({ active_learning_path_id: id, brand: BRAND })
  asMock(HttpClient.POST).mockResolvedValue({ active_learning_path_id: NEXT_LP_ID, brand: BRAND })
}

beforeEach(() => {
  clearLearningPathCaches()
  Object.keys(enrichedLearningPaths).forEach((key) => delete enrichedLearningPaths[Number(key)])

  asMock(HttpClient.GET).mockReset()
  asMock(HttpClient.POST).mockReset()
  asMock(contentStatusReset).mockResolvedValue(null)

  asMock(addContextToLearningPaths).mockImplementation((...args: any[]) =>
    args.length === 2 ? args[0]() : Promise.resolve(enrichedLearningPaths[args[1]])
  )

  givenProgressRecord({ content_brand: BRAND })
  givenEnrichedLearningPath(COMPLETED_LP_ID, { brand: BRAND })
  givenEnrichedLearningPath(NEXT_LP_ID, {
    brand: BRAND,
    preroll: { id: NEXT_PREROLL_ID },
    intro_video: { id: NEXT_INTRO_VIDEO_ID },
  })
})

const selfCollection = { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }

describe('onLearningPathCompletedActions', () => {
  describe('choosing the flow', () => {
    test('with My Path on, advances the active path through the v2 route and never touches v1', async () => {
      givenMyPathFlag({ enabled: true })
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(NEXT_LP_ID)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(advanceActiveLearningPath).toHaveBeenCalledWith(BRAND, expect.any(Date))
      expect(HttpClient.GET).not.toHaveBeenCalled()
      expect(HttpClient.POST).not.toHaveBeenCalled()
      expect(fetchMethodV2Structure).not.toHaveBeenCalled()
    })

    test('with My Path off, takes the v1 route for the same brand and never touches v2', async () => {
      givenMyPathFlag({ enabled: false })
      givenLegacyActiveLearningPath(COMPLETED_LP_ID)
      givenMethodPublishedOrder([COMPLETED_LP_ID, NEXT_LP_ID])

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(asMock(HttpClient.GET).mock.calls[0][0]).toContain(`active-path/get?brand=${BRAND}`)
      expect(fetchActiveLearningPath).not.toHaveBeenCalled()
      expect(advanceActiveLearningPath).not.toHaveBeenCalled()
    })

    test('reads the flag against the musora brand, whatever the learning path brand is', async () => {
      givenMyPathFlag({ enabled: false })
      givenLegacyActiveLearningPath(999)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(featureFlags.accessible).toHaveBeenCalledWith('my-path', 'musora')
    })

    test('waits for the first flag fetch before deciding', async () => {
      givenMyPathFlag({ enabled: true, ready: false })
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(NEXT_LP_ID)
      const order: string[] = []
      asMock(featureFlags.refresh).mockImplementation(async () => {
        order.push('refresh')
      })
      asMock(featureFlags.accessible).mockImplementation(() => {
        order.push('accessible')
        return true
      })

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(featureFlags.refresh).toHaveBeenCalledWith('musora')
      expect(order).toEqual(['refresh', 'accessible'])
    })

    test('does not refetch flags that are already loaded', async () => {
      givenMyPathFlag({ enabled: true, ready: true })
      givenActiveLearningPath(null)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(featureFlags.refresh).not.toHaveBeenCalled()
    })

    test('falls back to the v1 route when the flag fetch fails', async () => {
      givenMyPathFlag({ enabled: false, ready: false })
      asMock(featureFlags.refresh).mockRejectedValue(new Error('flags down'))
      givenLegacyActiveLearningPath(999)

      await expect(onLearningPathCompletedActions(COMPLETED_LP_ID)).resolves.toBeUndefined()

      expect(advanceActiveLearningPath).not.toHaveBeenCalled()
      expect(HttpClient.GET).toHaveBeenCalled()
    })
  })

  describe('finding the brand', () => {
    beforeEach(() => {
      givenMyPathFlag({ enabled: true })
      givenActiveLearningPath(null)
    })

    test('uses the brand on the progress record without fetching the learning path', async () => {
      givenProgressRecord({ content_brand: 'pianote' })

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(db.contentProgress.getOneProgressByContentId).toHaveBeenCalledWith(COMPLETED_LP_ID, {
        id: COMPLETED_LP_ID,
        type: COLLECTION_TYPE.LEARNING_PATH,
      })
      expect(addContextToLearningPaths).not.toHaveBeenCalled()
      expect(fetchActiveLearningPath).toHaveBeenCalledWith('pianote')
    })

    test.each([
      ['there is no progress record', null],
      ['the record has no brand', { content_brand: null }],
      ['the record has an empty brand', { content_brand: '' }],
    ])('falls back to the enriched learning path when %s', async (_label, record) => {
      givenProgressRecord(record)
      givenEnrichedLearningPath(COMPLETED_LP_ID, { brand: 'guitareo' })

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(fetchActiveLearningPath).toHaveBeenCalledWith('guitareo')
    })

    test('does nothing when no brand can be found', async () => {
      givenProgressRecord(null)
      givenEnrichedLearningPath(COMPLETED_LP_ID, { brand: undefined })

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(fetchActiveLearningPath).not.toHaveBeenCalled()
      expect(HttpClient.GET).not.toHaveBeenCalled()
      expect(featureFlags.accessible).not.toHaveBeenCalled()
    })
  })

  describe('My Path', () => {
    beforeEach(() => givenMyPathFlag({ enabled: true }))

    test('does nothing when a different learning path is active', async () => {
      givenActiveLearningPath(999)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(advanceActiveLearningPath).not.toHaveBeenCalled()
      expect(contentStatusReset).not.toHaveBeenCalled()
    })

    test('does nothing, and does not throw, when the user has no active path', async () => {
      givenActiveLearningPath(null)

      await expect(onLearningPathCompletedActions(COMPLETED_LP_ID)).resolves.toBeUndefined()

      expect(advanceActiveLearningPath).not.toHaveBeenCalled()
    })

    test('resets the preroll of the learning path it advances to, locally and pushed', async () => {
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(NEXT_LP_ID)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(contentStatusReset).toHaveBeenCalledTimes(1)
      expect(contentStatusReset).toHaveBeenCalledWith(NEXT_PREROLL_ID, selfCollection, { skipPush: false })
    })

    test('resets the preroll, not the Method intro video', async () => {
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(NEXT_LP_ID)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(asMock(contentStatusReset).mock.calls.map((call) => call[0])).not.toContain(NEXT_INTRO_VIDEO_ID)
    })

    test('does not reset anything when the advance stays on the completed path', async () => {
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(COMPLETED_LP_ID)

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(contentStatusReset).not.toHaveBeenCalled()
    })

    test('does not throw or reset when the next learning path has no preroll', async () => {
      givenActiveLearningPath(COMPLETED_LP_ID)
      givenAdvanceMovesTo(NEXT_LP_ID)
      givenEnrichedLearningPath(NEXT_LP_ID, { brand: BRAND })

      await expect(onLearningPathCompletedActions(COMPLETED_LP_ID)).resolves.toBeUndefined()

      expect(contentStatusReset).not.toHaveBeenCalled()
    })
  })

  describe('Method (My Path off)', () => {
    beforeEach(() => givenMyPathFlag({ enabled: false }))

    test('does nothing when a different learning path is active', async () => {
      givenLegacyActiveLearningPath(999)
      givenMethodPublishedOrder([COMPLETED_LP_ID, NEXT_LP_ID])

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(HttpClient.POST).not.toHaveBeenCalled()
      expect(contentStatusReset).not.toHaveBeenCalled()
    })

    test('does nothing when the completed path is the last published one', async () => {
      givenLegacyActiveLearningPath(COMPLETED_LP_ID)
      givenMethodPublishedOrder([NEXT_LP_ID, COMPLETED_LP_ID])

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(HttpClient.POST).not.toHaveBeenCalled()
      expect(contentStatusReset).not.toHaveBeenCalled()
    })

    test('does nothing when the completed path is not in the published list', async () => {
      givenLegacyActiveLearningPath(COMPLETED_LP_ID)
      givenMethodPublishedOrder([NEXT_LP_ID])

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(HttpClient.POST).not.toHaveBeenCalled()
    })

    test('skips next learning paths that are not yet published', async () => {
      givenLegacyActiveLearningPath(COMPLETED_LP_ID)
      asMock(fetchMethodV2Structure).mockResolvedValue({
        learning_paths: [
          { id: COMPLETED_LP_ID, published_on: '2020-01-01T00:00:00Z' },
          { id: NEXT_LP_ID, published_on: '2999-01-01T00:00:00Z' },
        ],
      })

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(HttpClient.POST).not.toHaveBeenCalled()
    })

    test('starts the next learning path and resets its intro video', async () => {
      givenLegacyActiveLearningPath(COMPLETED_LP_ID)
      givenMethodPublishedOrder([COMPLETED_LP_ID, NEXT_LP_ID])

      await onLearningPathCompletedActions(COMPLETED_LP_ID)

      expect(asMock(HttpClient.POST).mock.calls[0][0]).toContain('active-path/set')
      expect(asMock(HttpClient.POST).mock.calls[0][1]).toEqual({ brand: BRAND, learning_path_id: NEXT_LP_ID })
      expect(contentStatusReset).toHaveBeenCalledWith(NEXT_INTRO_VIDEO_ID, selfCollection, { skipPush: false })
    })
  })
})
