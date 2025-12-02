import {
  recordWatchSession,
  getProgressPercentage,
  dataContext,
  getProgressState,
  contentStatusCompleted,
  contentStatusReset,
  assignmentStatusCompleted,
} from '../../src/services/contentProgress'
import { initializeTestService } from '../initializeTests'

describe('contentProgressDataContextLocal', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  }, 1000000)

  test('verifyProgressPercentage', async () => {
    let contentId = 241250
    await contentStatusReset(contentId)

    await recordWatchSession(contentId, null, 'video', 'vimeo', 100, 50, 50)

    let result = await getProgressPercentage(contentId)
    expect(result).toBe(50)
    dataContext.clearCache()

    result = await getProgressPercentage(contentId)
    expect(result).toBe(50)
  }, 100000)

  test('verifyState', async () => {
    let contentId = 241251
    await contentStatusReset(contentId)

    let result = await getProgressState(contentId)
    expect(result).toBe('')

    await recordWatchSession(contentId, null, 'video', 'vimeo', 100, 50, 50)

    result = await getProgressState(contentId)
    expect(result).toBe('started')
    dataContext.clearCache()
    await new Promise((resolve) => setTimeout(resolve, 3000)) // 3 sec

    result = await getProgressState(contentId)
    expect(result).toBe('started')
  }, 100000)

  test('verifyStateCompleted', async () => {
    let contentId = 241252
    await contentStatusReset(contentId)

    await contentStatusCompleted(241252)
    let result = await getProgressState(241252)
    expect(result).toBe('completed')

    result = await getProgressState(contentId)
    expect(result).toBe('completed')
    dataContext.clearCache()

    result = await getProgressState(contentId)
    expect(result).toBe('completed')
  }, 100000)

  test('verifyStateReset', async () => {
    let contentId = 241253
    await contentStatusReset(contentId)

    await contentStatusCompleted(contentId)

    let result = await getProgressState(contentId)
    expect(result).toBe('completed')
    await contentStatusReset(contentId)

    result = await getProgressState(contentId)
    expect(result).toBe('')
    dataContext.clearCache()

    result = await getProgressState(contentId)
    expect(result).toBe('')
  }, 100000)

  test('assignmentCompleteBubblingToCompletedMultiple', async () => {
    let contentId = 281709
    await contentStatusReset(contentId)

    let state = await getProgressState(contentId)
    expect(state).toBe('')

    let assignmentIds = [281710, 281711, 281712, 281713, 281714, 281715]
    for (const assignmentId of assignmentIds) {
      await assignmentStatusCompleted(assignmentId, contentId)
      state = await getProgressState(assignmentId)
      expect(state).toBe('completed')
    }

    state = await getProgressState(contentId) //assignment
    expect(state).toBe('completed')

    dataContext.clearCache()

    state = await getProgressState(contentId) //assignment
    expect(state).toBe('completed')

    for (const assignmentId of assignmentIds) {
      state = await getProgressState(assignmentId)
      expect(state).toBe('completed')
    }
  }, 100000)
})
