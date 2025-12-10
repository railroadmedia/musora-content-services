import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { COLLECTION_TYPE, emitLearningPathProgress, emitAlaCarteProgress, waitForDebounce } from './helpers/progress-emitter'
import { mockCollectionAwareCompletion } from './helpers/completion-mock'

jest.mock('../../src/services/sanity', () => ({
  default: { fetch: jest.fn() },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getOneProgressByContentId: jest.fn(),
      getSomeProgressByContentIds: jest.fn(),
      queryOne: jest.fn(),
      queryAll: jest.fn()
    },
    practices: {
      sumPracticeMinutesForContent: jest.fn()
    },
    userAwardProgress: {
      hasCompletedAward: jest.fn(),
      recordAwardProgress: jest.fn(),
      getByAwardId: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'

describe('Duplicate Award Prevention', () => {
  let listeners

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    setupDefaultMocks(db, fetchSanity)

    await awardDefinitions.refresh()

    listeners = setupAwardEventListeners(awardEvents)

    await contentProgressObserver.start()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
    contentProgressObserver.stop()
  })

  // Shared child 418003 exists in both:
  // - Skill pack (418000): child_ids [418001, 418002, 418003]
  // - Learning path (418010): child_ids [418003, 418004, 418005]
  const lpAward = getAwardByContentId(418010)
  const skillPackAward = getAwardByContentId(418000)
  const sharedChild = 418003

  test('completing shared lesson within LP context only grants LP award', async () => {
    mockCollectionAwareCompletion(db, {
      [`${sharedChild}:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true,
      [`418004:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true,
      [`418005:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true
    })

    emitLearningPathProgress(sharedChild, lpAward.content_id)
    await waitForDebounce()

    const grantedAwardIds = listeners.granted.mock.calls.map(call => call[0].awardId)

    expect(grantedAwardIds).toContain(lpAward._id)
    expect(grantedAwardIds).not.toContain(skillPackAward._id)
  })

  test('completing shared lesson a la carte triggers both awards', async () => {
    mockCollectionAwareCompletion(db, {
      '418001': true,
      '418002': true,
      '418003': true,
      '418004': true,
      '418005': true,
      [`418003:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true,
      [`418004:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true,
      [`418005:${COLLECTION_TYPE.LEARNING_PATH}:${lpAward.content_id}`]: true
    })

    emitAlaCarteProgress(sharedChild)
    await waitForDebounce()

    const grantedAwardIds = listeners.granted.mock.calls.map(call => call[0].awardId)

    expect(grantedAwardIds).toContain(lpAward._id)
    expect(grantedAwardIds).toContain(skillPackAward._id)
  })

  test('completing lesson in wrong LP collection does not grant award', async () => {
    const wrongCollectionId = 999999

    mockCollectionAwareCompletion(db, {
      [`418003:${COLLECTION_TYPE.LEARNING_PATH}:${wrongCollectionId}`]: true,
      [`418004:${COLLECTION_TYPE.LEARNING_PATH}:${wrongCollectionId}`]: true,
      [`418005:${COLLECTION_TYPE.LEARNING_PATH}:${wrongCollectionId}`]: true
    })

    emitLearningPathProgress(418003, wrongCollectionId)
    await waitForDebounce()

    expect(listeners.granted).not.toHaveBeenCalled()
  })
})
