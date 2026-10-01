import { initializeTestDB } from './initializeTestDB'
import { COLLECTION_TYPE } from '../../src/services/sync/models/ContentProgress'
import { contentStatusCompleted, getProgressState } from '../../src/services/contentProgress.js'

jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  __esModule: true,
  GET: jest.fn(),
  PUT: jest.fn(),
  POST: jest.fn(),
  PATCH: jest.fn(),
  DELETE: jest.fn(),
  HttpClient: jest.fn(),
}))

jest.mock('../../src/services/sanity.js', () => ({
  __esModule: true,
  getHierarchy: jest.fn((contentId: number) => Promise.resolve({
    topLevelId: contentId,
    parents: {},
    children: {},
    metadata: { [contentId]: { brand: 'drumeo', type: 'lesson', parent_id: 0 } },
  })),
  getHierarchies: jest.fn((contentIds: number[] = []) => Promise.resolve(
    Object.fromEntries(contentIds.map(id => [id, {
      topLevelId: id,
      parents: {},
      children: {},
      metadata: { [id]: { brand: 'drumeo', type: 'lesson', parent_id: 0 } },
    }])),
  )),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
}))

jest.mock('../../src/services/railcontent.js', () => ({
  __esModule: true,
  fetchLikeCount: jest.fn().mockResolvedValue(0),
  fetchUserPermissionsData: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
}))

jest.mock('../../src/services/awards/internal/content-progress-observer', () => ({
  contentProgressObserver: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  },
}))

jest.mock('../../src/services/progress-events', () => ({
  emitProgressSaved: jest.fn(),
}))

jest.mock('../../src/services/userActivity', () => ({
  trackUserPractice: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/services/my-path/placement-quiz', () => ({
  __esModule: true,
  fetchQuizAnswers: jest.fn(),
}))

const placementQuiz = require('../../src/services/my-path/placement-quiz')
const { completePreroll, completeMyPathIntroVideo } = require('../../src/services/my-path/preroll.ts')

initializeTestDB()

const learningPathCollection = { type: COLLECTION_TYPE.LEARNING_PATH, id: 10 }

async function waitForProgressState(contentId: number, expectedState: string): Promise<string> {
  let state = await getProgressState(contentId)
  for (let attempt = 0; attempt < 50 && state !== expectedState; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    state = await getProgressState(contentId)
  }
  return state
}

beforeEach(() => {
  placementQuiz.fetchQuizAnswers.mockReset()
})

describe('completePreroll', () => {
  test('completes the preroll', async () => {
    const result = await completePreroll(900)

    expect(result).toBeTruthy()
    expect(await getProgressState(900)).toBe('completed')
  })

  test('returns null when the preroll is already completed', async () => {
    await contentStatusCompleted(901)
    expect(await completePreroll(901)).toBeNull()
  })

  test('leaves learning path lesson progress untouched', async () => {
    await contentStatusCompleted(301, learningPathCollection)
    await contentStatusCompleted(302, learningPathCollection)

    await completePreroll(902)

    expect(await getProgressState(301, learningPathCollection)).toBe('completed')
    expect(await getProgressState(302, learningPathCollection)).toBe('completed')
  })
})

describe('completeMyPathIntroVideo', () => {
  const quizAnswers = {
    user_id: '1',
    brand: 'drumeo',
    answers: { skill_level: 'beginner', genres: ['rock'], gear: ['drum-set'] },
  }

  test('returns the placement quiz answers for the brand', async () => {
    placementQuiz.fetchQuizAnswers.mockResolvedValueOnce(quizAnswers)

    const result = await completeMyPathIntroVideo(950, 'drumeo')

    expect(result).toEqual(quizAnswers)
    expect(placementQuiz.fetchQuizAnswers).toHaveBeenCalledWith('drumeo')
    await waitForProgressState(950, 'completed')
  })

  test('completes the intro video', async () => {
    placementQuiz.fetchQuizAnswers.mockResolvedValueOnce(quizAnswers)

    await completeMyPathIntroVideo(951, 'drumeo')

    expect(await waitForProgressState(951, 'completed')).toBe('completed')
  })

  test('keeps an already completed intro video completed', async () => {
    await contentStatusCompleted(952)
    placementQuiz.fetchQuizAnswers.mockResolvedValueOnce(quizAnswers)

    await completeMyPathIntroVideo(952, 'drumeo')

    expect(await getProgressState(952)).toBe('completed')
  })

  test('completes the intro video even when fetching quiz answers fails', async () => {
    placementQuiz.fetchQuizAnswers.mockRejectedValueOnce(new Error('network'))

    await expect(completeMyPathIntroVideo(953, 'drumeo')).rejects.toThrow('network')
    expect(await waitForProgressState(953, 'completed')).toBe('completed')
  })
})
