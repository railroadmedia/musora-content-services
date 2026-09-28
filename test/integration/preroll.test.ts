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
  fetchSanity: jest.fn(),
  fetchMethodV2Structure: jest.fn(),
  hasAnyMethodV2IntroCompleted: jest.fn(),
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

const HttpClient = require('../../src/infrastructure/http/HttpClient.ts')
const sanity = require('../../src/services/sanity.js')
const { fetchPreroll, completePreroll } = require('../../src/services/my-path/preroll.ts')
const { resetLearningPathCachesForTests } = require('../../src/services/my-path/learning-paths.ts')

initializeTestDB()

const learningPathCollection = { type: COLLECTION_TYPE.LEARNING_PATH, id: 10 }

function setActivePath(activePath: any) {
  HttpClient.GET.mockImplementation((url: string) =>
    Promise.resolve(url.includes('/active-path/get') ? activePath : null),
  )
}

function methodIntroCompleteActionsCalls() {
  return HttpClient.POST.mock.calls.filter(
    (call: any[]) => call[0].includes('/method-intro-video-complete-actions'),
  )
}

beforeEach(() => {
  resetLearningPathCachesForTests()
  HttpClient.GET.mockReset()
  HttpClient.POST.mockReset()
  sanity.fetchSanity.mockReset()
  sanity.fetchMethodV2Structure.mockReset()
  sanity.hasAnyMethodV2IntroCompleted.mockReset()

  HttpClient.POST.mockResolvedValue(null)
  setActivePath({ active_learning_path_id: 10 })
  sanity.hasAnyMethodV2IntroCompleted.mockResolvedValue(false)
})

describe('fetchPreroll', () => {
  test('queries the learning-path-intro document by id as a single result', async () => {
    const preroll = { id: 800, title: 'Welcome to Learn To Play The Drums', video: { type: 'vimeo' } }
    sanity.fetchSanity.mockResolvedValueOnce(preroll)

    const result = await fetchPreroll(800)

    expect(result).toEqual(preroll)
    const [query, isList] = sanity.fetchSanity.mock.calls[0]
    expect(query).toContain(`_type == 'learning-path-intro' && railcontent_id == 800`)
    expect(query).toContain('video')
    expect(isList).toBe(false)
  })

  test('returns null when the preroll does not exist', async () => {
    sanity.fetchSanity.mockResolvedValueOnce(null)
    expect(await fetchPreroll(801)).toBeNull()
  })
})

describe('completePreroll', () => {
  test('completes the preroll', async () => {
    const result = await completePreroll(900, 'drumeo')

    expect(result).toBeTruthy()
    expect(await getProgressState(900)).toBe('completed')
  })

  test('returns null when the preroll is already completed', async () => {
    await contentStatusCompleted(901)
    expect(await completePreroll(901, 'drumeo')).toBeNull()
  })

  test('leaves learning path progress untouched', async () => {
    await contentStatusCompleted(10, learningPathCollection)
    await contentStatusCompleted(301, learningPathCollection)

    await completePreroll(902, 'drumeo')

    expect(await getProgressState(10, learningPathCollection)).toBe('completed')
    expect(await getProgressState(301, learningPathCollection)).toBe('completed')
  })

  test('sets up the method when the method intro was watched on another brand', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setActivePath(null)
    sanity.fetchMethodV2Structure.mockResolvedValue({ learning_paths: [{ id: 10 }] })
    HttpClient.POST.mockResolvedValue({ active_learning_path_id: 10 })

    await completePreroll(903, 'drumeo')

    expect(methodIntroCompleteActionsCalls()).toHaveLength(1)
    expect(await getProgressState(903)).toBe('completed')
  })

  test('skips method setup when the user already has an active path', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)

    await completePreroll(904, 'drumeo')

    expect(methodIntroCompleteActionsCalls()).toHaveLength(0)
  })
})
