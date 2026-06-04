import { initializeTestDB } from './initializeTestDB'
import { COLLECTION_TYPE, STATE } from '../../src/services/sync/models/ContentProgress'
import { LEARNING_PATH_LESSON } from '../../src/contentTypeConfig'
import db from '../../src/services/sync/repository-proxy'
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
  fetchByRailContentId: jest.fn(),
  fetchByRailContentIds: jest.fn(),
  fetchMethodV2Structure: jest.fn(),
  fetchParentChildRelationshipsFor: jest.fn(),
  hasAnyMethodV2IntroCompleted: jest.fn(),
  devFetchAllLearningPathsAndIntroVideoIdsForDelete: jest.fn(),
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

jest.mock('../../src/services/awards/award-query.js', () => ({
  __esModule: true,
  getContentAwardsByIds: jest.fn((ids: number[] = []) => Promise.resolve(
    Object.fromEntries(ids.map(id => [id, { awards: [] }])),
  )),
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

const {
  mapContentToParent,
  isNextLessonLocked,
  getDailySession,
  updateDailySession,
  getActivePath,
  startLearningPath,
  getEnrichedLearningPath,
  getEnrichedLearningPaths,
  getLearningPathLessonsByIds,
  fetchLearningPathProgressCheckLessons,
  fetchLearningPathLessons,
  resetAllLearningPaths,
  completeMethodIntroVideo,
  completeLearningPathIntroVideo,
  onLearningPathCompletedActions,
  mapLearningPathParentsTo,
  mapContentsThatWereLastProgressedFromMethod,
} = require('../../src/services/content-org/learning-paths.ts')

const ctx = initializeTestDB()

const lpType = COLLECTION_TYPE.LEARNING_PATH

type ApiResponses = {
  activePath?: any
  dailySession?: any
}

function setApiResponses(r: ApiResponses) {
  HttpClient.GET.mockImplementation((url: string) => {
    if (url.includes('/active-path/get')) return Promise.resolve(r.activePath ?? null)
    if (url.includes('/daily-session')) return Promise.resolve(r.dailySession ?? null)
    return Promise.resolve(null)
  })
}

beforeEach(() => {
  HttpClient.GET.mockReset()
  HttpClient.POST.mockReset()
  sanity.fetchByRailContentId.mockReset()
  sanity.fetchByRailContentIds.mockReset()
  sanity.fetchMethodV2Structure.mockReset()
  sanity.fetchParentChildRelationshipsFor.mockReset()
  sanity.hasAnyMethodV2IntroCompleted.mockReset()
  sanity.devFetchAllLearningPathsAndIntroVideoIdsForDelete.mockReset()

  HttpClient.POST.mockResolvedValue(null)
  setApiResponses({
    activePath: { active_learning_path_id: 0 },
    dailySession: { active_learning_path_id: 0, daily_session: [] },
  })
  sanity.fetchByRailContentId.mockResolvedValue(false)
  sanity.fetchByRailContentIds.mockResolvedValue([])
  sanity.fetchMethodV2Structure.mockResolvedValue({ learning_paths: [] })
  sanity.fetchParentChildRelationshipsFor.mockResolvedValue([])
  sanity.hasAnyMethodV2IntroCompleted.mockResolvedValue(false)
})

function makeLp(id: number, children: Array<{ id: number; type?: string }> = [], extras: any = {}) {
  return {
    id,
    type: lpType,
    brand: 'drumeo',
    children: children.map(c => ({ id: c.id, type: c.type ?? 'lesson' })),
    ...extras,
  }
}

describe('mapContentToParent', () => {
  test('returns null when null', () => {
    expect(mapContentToParent(null)).toBeNull()
  })

  test('returns empty array unchanged', () => {
    expect(mapContentToParent([])).toEqual([])
  })

  test('maps single object', () => {
    const result = mapContentToParent(
      { id: 1, type: 'foo' },
      { lessonType: 'bar', parentContentId: 99 },
    )
    expect(result).toEqual({ id: 1, type: 'bar', parent_id: 99 })
  })

  test('maps array', () => {
    const result = mapContentToParent(
      [{ id: 1 }, { id: 2 }],
      { lessonType: 'x', parentContentId: 7 },
    )
    expect(result).toEqual([
      { id: 1, type: 'x', parent_id: 7 },
      { id: 2, type: 'x', parent_id: 7 },
    ])
  })
})

describe('isNextLessonLocked', () => {
  test('false when no dailies', () => {
    expect(isNextLessonLocked({} as any)).toBe(false)
  })

  test('true when all dailies completed and next lesson needs access', () => {
    expect(isNextLessonLocked({
      learning_path_dailies: [{ progressStatus: 'completed', need_access: true }],
      upcoming_lessons: [{ need_access: true }],
    } as any)).toBe(true)
  })

  test('false when all dailies completed and next lesson accessible', () => {
    expect(isNextLessonLocked({
      learning_path_dailies: [{ progressStatus: 'completed', need_access: false }],
      upcoming_lessons: [{ need_access: false }],
    } as any)).toBe(false)
  })

  test('false when all dailies accessible', () => {
    expect(isNextLessonLocked({
      learning_path_dailies: [
        { progressStatus: 'started', need_access: false },
        { progressStatus: 'started', need_access: false },
        { progressStatus: 'started', need_access: false },
      ],
    } as any)).toBe(false)
  })

  test('false when a locked daily exists but its not next', () => {
    expect(isNextLessonLocked({
      learning_path_dailies: [
        { progressStatus: 'completed', need_access: false },
        { progressStatus: 'started', need_access: false },
        { progressStatus: 'started', need_access: true },
      ],
    } as any)).toBe(false)
  })

  test('true when all remaining dailies are locked', () => {
    expect(isNextLessonLocked({
      learning_path_dailies: [
        { progressStatus: 'completed', need_access: false },
        { progressStatus: 'completed', need_access: false },
        { progressStatus: 'started', need_access: true },
      ],
    } as any)).toBe(true)
  })
})

describe('getDailySession', () => {
  test('returns response when present', async () => {
    const resp = { active_learning_path_id: 5, daily_session: [] }
    setApiResponses({ dailySession: resp })
    const result = await getDailySession('drumeo', new Date('2026-01-01T10:00:00Z'), true)
    expect(result).toEqual(resp)
    expect(HttpClient.GET.mock.calls[0][0]).toContain('/daily-session/get?brand=drumeo')
  })

  test('falls back to updateDailySession when empty', async () => {
    setApiResponses({ dailySession: '' })
    const created = { active_learning_path_id: 9, daily_session: [] }
    HttpClient.POST.mockResolvedValueOnce(created)
    const result = await getDailySession('pianote', new Date('2026-01-01T10:00:00Z'), true)
    expect(result).toEqual(created)
    expect(HttpClient.POST).toHaveBeenCalledTimes(1)
  })

  test('concurrent calls share single GET (cached promise reuse)', async () => {
    const resp = { active_learning_path_id: 5, daily_session: [] }
    setApiResponses({ dailySession: resp })
    const [a, b] = await Promise.all([
      getDailySession('drumeo', new Date('2026-01-01T10:00:00Z')),
      getDailySession('drumeo', new Date('2026-01-01T10:00:00Z')),
    ])
    expect(a).toEqual(resp)
    expect(b).toEqual(resp)
    expect(HttpClient.GET).toHaveBeenCalledTimes(1)
  })

  test('returns null and logs when GET throws', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    HttpClient.GET.mockImplementationOnce(() => Promise.reject(new Error('boom')))
    const result = await getDailySession('drumeo', new Date('2026-01-01T10:00:00Z'), true)
    expect(result).toBeNull()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})

describe('updateDailySession', () => {
  test('posts and returns response', async () => {
    const resp = { active_learning_path_id: 7, daily_session: [] }
    HttpClient.POST.mockResolvedValueOnce(resp)
    setApiResponses({ dailySession: resp })
    const result = await updateDailySession('drumeo', new Date('2026-01-01T10:00:00Z'), true)
    expect(result).toEqual(resp)
    const [url, body] = HttpClient.POST.mock.calls[0]
    expect(url).toContain('/daily-session/create')
    expect(body.brand).toBe('drumeo')
    expect(body.keepFirstLearningPath).toBe(true)
  })

  test('returns null on empty-string response', async () => {
    HttpClient.POST.mockResolvedValueOnce('')
    setApiResponses({ dailySession: '' })
    const result = await updateDailySession('drumeo', new Date('2026-01-01T10:00:00Z'))
    expect(result).toBeNull()
  })

  test('returns null on POST error', async () => {
    HttpClient.POST.mockRejectedValueOnce(new Error('boom'))
    const result = await updateDailySession('drumeo', new Date('2026-01-01T10:00:00Z'))
    expect(result).toBeNull()
  })

  test('defaults keepFirstLearningPath to false', async () => {
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 1, daily_session: [] })
    await updateDailySession('drumeo', new Date('2026-01-01T10:00:00Z'))
    expect(HttpClient.POST.mock.calls[0][1].keepFirstLearningPath).toBe(false)
  })
})

describe('getActivePath', () => {
  test('returns response', async () => {
    const resp = { user_id: 1, brand: 'drumeo', active_learning_path_id: 42 }
    setApiResponses({ activePath: resp })
    const result = await getActivePath('drumeo', true)
    expect(result).toEqual(resp)
    expect(HttpClient.GET.mock.calls[0][0]).toContain('/active-path/get?brand=drumeo')
  })

  test('concurrent calls share single GET (cached promise reuse)', async () => {
    const resp = { user_id: 1, brand: 'drumeo', active_learning_path_id: 7 }
    setApiResponses({ activePath: resp })
    const [a, b] = await Promise.all([getActivePath('drumeo'), getActivePath('drumeo')])
    expect(a).toEqual(resp)
    expect(b).toEqual(resp)
    expect(HttpClient.GET).toHaveBeenCalledTimes(1)
  })
})

describe('startLearningPath', () => {
  test('posts and triggers GET refresh', async () => {
    const resp = { user_id: 1, brand: 'drumeo', active_learning_path_id: 11 }
    HttpClient.POST.mockResolvedValueOnce(resp)
    setApiResponses({ activePath: resp })
    const result = await startLearningPath('drumeo', 11)
    expect(result).toEqual(resp)
    const [url, body] = HttpClient.POST.mock.calls[0]
    expect(url).toContain('/active-path/set')
    expect(body).toEqual({ brand: 'drumeo', learning_path_id: 11 })
  })

  test('does not trigger GET refresh when POST returns falsy', async () => {
    HttpClient.POST.mockResolvedValueOnce(null)
    await startLearningPath('drumeo', 11)
    const getCalls = HttpClient.GET.mock.calls.filter((c: any[]) => c[0].includes('/active-path/get'))
    expect(getCalls).toHaveLength(0)
  })
})

describe('resetAllLearningPaths', () => {
  test('erases progress in db and posts reset', async () => {
    sanity.fetchByRailContentId.mockResolvedValue(makeLp(200))
    setApiResponses({ activePath: { active_learning_path_id: 999 } })
    await contentStatusCompleted(100)
    await contentStatusCompleted(200, { type: lpType, id: 200 })
    expect(await getProgressState(100)).toBe('completed')
    expect(await getProgressState(200, { type: lpType, id: 200 })).toBe('completed')

    sanity.devFetchAllLearningPathsAndIntroVideoIdsForDelete.mockResolvedValueOnce({
      intros: [100],
      learning_paths: [200],
    })
    HttpClient.POST.mockResolvedValueOnce({})

    await resetAllLearningPaths()

    expect(await getProgressState(100)).toBe('')
    expect(await getProgressState(200, { type: lpType, id: 200 })).toBe('')
    expect(HttpClient.POST.mock.calls.some((c: any[]) => c[0].endsWith('/reset'))).toBe(true)
  })
})

describe('getEnrichedLearningPath', () => {
  test('returns null when fetched lp is falsy', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(null)
    const result = await getEnrichedLearningPath(1)
    expect(result).toBeFalsy()
  })

  test('maps children to LEARNING_PATH_LESSON with parent_id', async () => {
    const lp = makeLp(10, [{ id: 100 }, { id: 101 }])
    sanity.fetchByRailContentId.mockResolvedValueOnce(lp)

    const result = await getEnrichedLearningPath(10)
    expect(result.children).toHaveLength(2)
    expect(result.children[0]).toEqual(expect.objectContaining({
      id: 100,
      type: LEARNING_PATH_LESSON,
      parent_id: 10,
    }))
  })

  test('reflects real progress state from db', async () => {
    const lp = makeLp(20, [{ id: 200 }, { id: 201 }])
    sanity.fetchByRailContentId.mockResolvedValueOnce(lp)
    await contentStatusCompleted(200, { type: lpType, id: 20 })

    const result = await getEnrichedLearningPath(20)
    const lesson200 = result.children.find((c: any) => c.id === 200)
    const lesson201 = result.children.find((c: any) => c.id === 201)
    expect(lesson200.progressStatus).toBe(STATE.COMPLETED)
    expect(lesson201.progressStatus).toBeFalsy()
  })

  test('adds awards to LP parent (second addContextToLearningPaths call)', async () => {
    const lp = makeLp(30, [{ id: 300 }])
    sanity.fetchByRailContentId.mockResolvedValueOnce(lp)
    const result = await getEnrichedLearningPath(30)
    expect(result.awards).toEqual([])
  })
})

describe('getEnrichedLearningPaths', () => {
  test('maps each lp children', async () => {
    const paths = [makeLp(1, [{ id: 10 }]), makeLp(2, [{ id: 20 }])]
    sanity.fetchByRailContentIds.mockResolvedValueOnce(paths)
    const result = await getEnrichedLearningPaths([1, 2])
    expect(result[0].children[0].parent_id).toBe(1)
    expect(result[1].children[0].parent_id).toBe(2)
  })

  test('returns empty array when fetched empty', async () => {
    sanity.fetchByRailContentIds.mockResolvedValueOnce([])
    const result = await getEnrichedLearningPaths([])
    expect(result).toEqual([])
  })
})

describe('getLearningPathLessonsByIds', () => {
  test('filters lessons by ids', async () => {
    const lp = makeLp(1, [{ id: 1 }, { id: 2 }, { id: 3 }])
    sanity.fetchByRailContentId.mockResolvedValueOnce(lp)
    const result = await getLearningPathLessonsByIds([1, 3], 1)
    expect(result.map((l: any) => l.id)).toEqual([1, 3])
  })
})

describe('fetchLearningPathProgressCheckLessons', () => {
  test('returns ids that have completed progress in db', async () => {
    await contentStatusCompleted(1)
    await contentStatusCompleted(3)
    const result = await fetchLearningPathProgressCheckLessons([1, 2, 3])
    expect(result.sort()).toEqual([1, 3])
  })

  test('returns [] when none completed', async () => {
    const result = await fetchLearningPathProgressCheckLessons([1, 2])
    expect(result).toEqual([])
  })
})

describe('fetchLearningPathLessons', () => {
  test('returns null when learning path has no children', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(makeLp(1, []))
    const result = await fetchLearningPathLessons(1, 'drumeo', new Date())
    expect(result).toBeNull()
  })

  test('returns is_active_learning_path false when not active', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(makeLp(1, [{ id: 100 }]))
    setApiResponses({ dailySession: { active_learning_path_id: 999, daily_session: [] } })
    const result = await fetchLearningPathLessons(1, 'drumeo', new Date())
    expect(result.is_active_learning_path).toBe(false)
  })

  test('categorizes dailies/completed/upcoming when active', async () => {
    const lp = makeLp(5, [{ id: 100 }, { id: 101 }, { id: 102 }])
    sanity.fetchByRailContentId.mockResolvedValue(lp)
    await contentStatusCompleted(101, { type: lpType, id: 5 })
    setApiResponses({
      dailySession: {
        active_learning_path_id: 5,
        active_learning_path_created_at: '2026-01-01',
        daily_session: [{ learning_path_id: 5, content_ids: [100] }],
      },
    })

    const result = await fetchLearningPathLessons(5, 'drumeo', new Date())
    expect(result.is_active_learning_path).toBe(true)
    expect(result.learning_path_dailies.map((l: any) => l.id)).toEqual([100])
    expect(result.completed_lessons.map((l: any) => l.id)).toEqual([101])
    expect(result.upcoming_lessons.map((l: any) => l.id)).toEqual([102])
  })

  test('returns null when learningPath fetch resolves falsy', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(null)
    const result = await fetchLearningPathLessons(1, 'drumeo', new Date())
    expect(result).toBeNull()
  })

  test('resolves previous and next learning path dailies', async () => {
    const lpCurrent = makeLp(5, [{ id: 100 }])
    const lpPrev = makeLp(4, [{ id: 40 }])
    const lpNext = makeLp(6, [{ id: 60 }])
    sanity.fetchByRailContentId.mockImplementation((id: number) => {
      if (id === 5) return Promise.resolve(lpCurrent)
      if (id === 4) return Promise.resolve(lpPrev)
      if (id === 6) return Promise.resolve(lpNext)
      return Promise.resolve(false)
    })
    setApiResponses({
      dailySession: {
        active_learning_path_id: 5,
        daily_session: [
          { learning_path_id: 4, content_ids: [40] },
          { learning_path_id: 5, content_ids: [100] },
          { learning_path_id: 6, content_ids: [60] },
        ],
      },
    })

    const result = await fetchLearningPathLessons(5, 'drumeo', new Date())
    expect(result.previous_learning_path_id).toBe(4)
    expect(result.previous_learning_path_dailies.map((l: any) => l.id)).toEqual([40])
    expect(result.next_learning_path_id).toBe(6)
    expect(result.next_learning_path_dailies.map((l: any) => l.id)).toEqual([60])
    expect(result.next_learning_path_dailies[0].in_next_learning_path).toBe(false)
  })

  test('in_next_learning_path true when current LP is completed', async () => {
    const lpCurrent = makeLp(5, [{ id: 100 }])
    const lpNext = makeLp(6, [{ id: 60 }])
    sanity.fetchByRailContentId.mockImplementation((id: number) => {
      if (id === 5) return Promise.resolve(lpCurrent)
      if (id === 6) return Promise.resolve(lpNext)
      return Promise.resolve(false)
    })
    setApiResponses({ activePath: { active_learning_path_id: 999 } })
    await contentStatusCompleted(5, { type: lpType, id: 5 })
    await contentStatusCompleted(100, { type: lpType, id: 5 })
    setApiResponses({
      dailySession: {
        active_learning_path_id: 5,
        daily_session: [
          { learning_path_id: 5, content_ids: [100] },
          { learning_path_id: 6, content_ids: [60] },
        ],
      },
    })

    const result = await fetchLearningPathLessons(5, 'drumeo', new Date())
    expect(result.progressStatus).toBe(STATE.COMPLETED)
    expect(result.next_learning_path_dailies[0].in_next_learning_path).toBe(true)
  })

  test('treats missing session.content_ids as empty array', async () => {
    const lp = makeLp(5, [{ id: 100 }])
    sanity.fetchByRailContentId.mockResolvedValueOnce(lp)
    setApiResponses({
      dailySession: {
        active_learning_path_id: 5,
        daily_session: [{ learning_path_id: 5 }],
      },
    })
    const result = await fetchLearningPathLessons(5, 'drumeo', new Date())
    expect(result.learning_path_dailies).toEqual([])
    expect(result.upcoming_lessons.map((l: any) => l.id)).toEqual([100])
  })
})

describe('completeMethodIntroVideo', () => {
  test('completes intro video in db and posts active-path actions', async () => {
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [{ id: 50 }, { id: 51 }],
    })
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 50 })

    const result = await completeMethodIntroVideo(700, 'drumeo')

    expect(result.intro_video_response).toBeTruthy()
    expect(await getProgressState(700)).toBe('completed')
    expect(result.active_path_response).toEqual({ active_learning_path_id: 50 })
    const methodCall = HttpClient.POST.mock.calls.find(
      (c: any[]) => c[0].includes('/method-intro-video-complete-actions'),
    )
    expect(methodCall).toBeDefined()
    expect(methodCall[1].brand).toBe('drumeo')
    expect(methodCall[1].learningPathId).toBe(50)
    expect(methodCall[1].userDate).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  test('skips intro completion when already completed', async () => {
    await contentStatusCompleted(701)
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [{ id: 50 }],
    })
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 50 })

    const result = await completeMethodIntroVideo(701, 'drumeo')
    expect(result.intro_video_response).toBeNull()
  })

  test('null intro video id skips completion', async () => {
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [{ id: 50 }],
    })
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 50 })
    const result = await completeMethodIntroVideo(null, 'drumeo')
    expect(result.intro_video_response).toBeNull()
  })
})

describe('completeLearningPathIntroVideo', () => {
  test('resets LP progress when no lessons to import', async () => {
    const collection = { type: lpType, id: 10 }
    sanity.fetchByRailContentId.mockResolvedValue(makeLp(10))
    setApiResponses({ activePath: { active_learning_path_id: 999 } })
    await contentStatusCompleted(10, collection)

    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({ activePath: { active_learning_path_id: 10 } })

    const result = await completeLearningPathIntroVideo(800, 10, null, 'drumeo')

    expect(result.learning_path_reset_response).toBeTruthy()
    expect(await getProgressState(10, collection)).toBe('')
    expect(result.intro_video_response).toBeTruthy()
    expect(await getProgressState(800)).toBe('completed')
  })

  test('imports lessons and updates dailies when active', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({
      activePath: { active_learning_path_id: 10 },
      dailySession: { active_learning_path_id: 10, daily_session: [] },
    })
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 10, daily_session: [] })

    const result = await completeLearningPathIntroVideo(801, 10, [301, 302], 'drumeo')

    expect(result.lesson_import_response).toBeTruthy()
    expect(await getProgressState(301, { type: lpType, id: 10 })).toBe('completed')
    expect(await getProgressState(302, { type: lpType, id: 10 })).toBe('completed')
    expect(result.update_dailies_response).toBeTruthy()
    expect(await getProgressState(801)).toBe('completed')
  })

  test('lateMethodSetup: triggers completeMethodIntroVideo when anyIntroComplete and no activePath', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({ activePath: null })
    sanity.fetchMethodV2Structure.mockResolvedValue({ learning_paths: [{ id: 10 }] })
    HttpClient.POST.mockResolvedValue({ active_learning_path_id: 10 })

    await completeLearningPathIntroVideo(802, 10, null, 'drumeo')

    const methodCalls = HttpClient.POST.mock.calls.filter(
      (c: any[]) => c[0].includes('/method-intro-video-complete-actions'),
    )
    expect(methodCalls.length).toBeGreaterThanOrEqual(1)
  })

  test('skips late method setup when anyIntroComplete is false', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(false)
    setApiResponses({ activePath: null })

    await completeLearningPathIntroVideo(803, 10, null, 'drumeo')

    const methodCalls = HttpClient.POST.mock.calls.filter(
      (c: any[]) => c[0].includes('/method-intro-video-complete-actions'),
    )
    expect(methodCalls).toHaveLength(0)
  })

  test('imports lessons but does not update dailies when LP is not active', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({ activePath: { active_learning_path_id: 999 } })

    const result = await completeLearningPathIntroVideo(804, 10, [304], 'drumeo')

    expect(result.lesson_import_response).toBeTruthy()
    expect(result.update_dailies_response).toBeUndefined()
    const dailyPosts = HttpClient.POST.mock.calls.filter(
      (c: any[]) => c[0].includes('/daily-session/create'),
    )
    expect(dailyPosts).toHaveLength(0)
  })

  test('skips updateDailySession when lateMethodSetup already set dailies', async () => {
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({ activePath: null })
    sanity.fetchMethodV2Structure.mockResolvedValue({ learning_paths: [{ id: 10 }] })
    HttpClient.POST.mockImplementation((url: string) => {
      if (url.includes('/method-intro-video-complete-actions')) {
        setApiResponses({ activePath: { active_learning_path_id: 10 } })
      }
      return Promise.resolve({ active_learning_path_id: 10, daily_session: [] })
    })

    const result = await completeLearningPathIntroVideo(805, 10, [305], 'drumeo')

    expect(result.update_dailies_response).toBeUndefined()
    const dailyPosts = HttpClient.POST.mock.calls.filter(
      (c: any[]) => c[0].includes('/daily-session/create'),
    )
    expect(dailyPosts).toHaveLength(0)
  })

  test('skips intro video completion when already completed', async () => {
    await contentStatusCompleted(806)
    sanity.hasAnyMethodV2IntroCompleted.mockResolvedValueOnce(true)
    setApiResponses({ activePath: { active_learning_path_id: 10 } })

    const result = await completeLearningPathIntroVideo(806, 10, null, 'drumeo')
    expect(result.intro_video_response).toBeNull()
  })
})

describe('onLearningPathCompletedActions', () => {
  test('returns early when not the active path', async () => {
    sanity.fetchByRailContentId.mockResolvedValue(makeLp(5))
    setApiResponses({ activePath: { active_learning_path_id: 99 } })
    await onLearningPathCompletedActions(5)
    const setPathCalls = HttpClient.POST.mock.calls.filter((c: any[]) => c[0].includes('/active-path/set'))
    expect(setPathCalls).toHaveLength(0)
  })

  test('starts next published learning path and resets its intro video', async () => {
    const lp = makeLp(5)
    const nextLp = { ...makeLp(6), intro_video: { id: 600 } }
    sanity.fetchByRailContentId
      .mockResolvedValueOnce(lp)
      .mockResolvedValueOnce(nextLp)
    setApiResponses({ activePath: { active_learning_path_id: 5 } })
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [
        { id: 5, published_on: '2025-01-01' },
        { id: 6, published_on: '2025-01-02' },
        { id: 7, published_on: null },
      ],
    })
    HttpClient.POST.mockResolvedValueOnce({ active_learning_path_id: 6 })
    await contentStatusCompleted(600)

    await onLearningPathCompletedActions(5)

    const setPathCalls = HttpClient.POST.mock.calls.filter((c: any[]) => c[0].includes('/active-path/set'))
    expect(setPathCalls).toHaveLength(1)
    expect(setPathCalls[0][1]).toEqual({ brand: 'drumeo', learning_path_id: 6 })
    expect(await getProgressState(600)).toBe('')
  })

  test('returns when no next learning path exists', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(makeLp(9))
    setApiResponses({ activePath: { active_learning_path_id: 9 } })
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [{ id: 9, published_on: '2025-01-01' }],
    })
    await onLearningPathCompletedActions(9)
    const setPathCalls = HttpClient.POST.mock.calls.filter((c: any[]) => c[0].includes('/active-path/set'))
    expect(setPathCalls).toHaveLength(0)
  })

  test('returns when active LP is not in published list', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(makeLp(8))
    setApiResponses({ activePath: { active_learning_path_id: 8 } })
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [
        { id: 8, published_on: null },
        { id: 9, published_on: '2025-01-01' },
      ],
    })
    await onLearningPathCompletedActions(8)
    const setPathCalls = HttpClient.POST.mock.calls.filter((c: any[]) => c[0].includes('/active-path/set'))
    expect(setPathCalls).toHaveLength(0)
  })

  test('skips next LP that is not yet published', async () => {
    sanity.fetchByRailContentId.mockResolvedValueOnce(makeLp(5))
    setApiResponses({ activePath: { active_learning_path_id: 5 } })
    sanity.fetchMethodV2Structure.mockResolvedValueOnce({
      learning_paths: [
        { id: 5, published_on: '2025-01-01' },
        { id: 6, published_on: '2099-01-01' },
      ],
    })
    await onLearningPathCompletedActions(5)
    const setPathCalls = HttpClient.POST.mock.calls.filter((c: any[]) => c[0].includes('/active-path/set'))
    expect(setPathCalls).toHaveLength(0)
  })
})

describe('mapLearningPathParentsTo', () => {
  test('maps parent_id from hierarchy', async () => {
    sanity.fetchParentChildRelationshipsFor.mockResolvedValueOnce([
      { railcontent_id: '100', children: [1, 2] },
      { railcontent_id: '200', children: [3] },
    ])
    const result = await mapLearningPathParentsTo(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { type: true, parent_id: true },
    )
    expect(result).toEqual([
      { id: 1, type: LEARNING_PATH_LESSON, parent_id: 100 },
      { id: 2, type: LEARNING_PATH_LESSON, parent_id: 100 },
      { id: 3, type: LEARNING_PATH_LESSON, parent_id: 200 },
    ])
  })

  test('id without parent in hierarchy gets parent_id undefined', async () => {
    sanity.fetchParentChildRelationshipsFor.mockResolvedValueOnce([
      { railcontent_id: '100', children: [1] },
    ])
    const result = await mapLearningPathParentsTo(
      [{ id: 1 }, { id: 99 }],
      { type: true, parent_id: true },
    )
    expect(result[0].parent_id).toBe(100)
    expect(result[1].parent_id).toBeUndefined()
  })

  test('only maps type when parent_id flag is false', async () => {
    sanity.fetchParentChildRelationshipsFor.mockResolvedValueOnce([
      { railcontent_id: '100', children: [1] },
    ])
    const result = await mapLearningPathParentsTo(
      [{ id: 1, type: 'orig' }],
      { type: true },
    )
    expect(result[0]).toEqual({ id: 1, type: LEARNING_PATH_LESSON })
  })

  test('only maps parent_id when type flag is false', async () => {
    sanity.fetchParentChildRelationshipsFor.mockResolvedValueOnce([
      { railcontent_id: '100', children: [1] },
    ])
    const result = await mapLearningPathParentsTo(
      [{ id: 1, type: 'orig' }],
      { parent_id: true },
    )
    expect(result[0]).toEqual({ id: 1, type: 'orig', parent_id: 100 })
  })
})

describe('mapContentsThatWereLastProgressedFromMethod', () => {
  test('returns input when empty', async () => {
    expect(await mapContentsThatWereLastProgressedFromMethod([])).toEqual([])
    expect(await mapContentsThatWereLastProgressedFromMethod(null)).toBeNull()
  })

  test('returns input unchanged when no eligible types', async () => {
    const input = [{ id: 1, type: 'song' }]
    expect(await mapContentsThatWereLastProgressedFromMethod(input)).toEqual(input)
  })

  test('maps eligible ids with parent data when last accessed from method', async () => {
    const collection = { type: lpType, id: 50 }
    sanity.fetchByRailContentId.mockResolvedValue(makeLp(50))
    setApiResponses({ activePath: { active_learning_path_id: 999 } })
    await contentStatusCompleted(1, collection)
    sanity.fetchParentChildRelationshipsFor.mockResolvedValueOnce([
      { railcontent_id: '50', children: [1] },
    ])

    const input = [
      { id: 1, type: 'skill-pack-lesson' },
      { id: 2, type: 'song' },
    ]
    const result = await mapContentsThatWereLastProgressedFromMethod(input)
    expect(result[0]).toEqual({ id: 1, type: LEARNING_PATH_LESSON, parent_id: 50 })
    expect(result[1]).toEqual({ id: 2, type: 'song' })
  })

  test('returns objects unchanged when none were last accessed from method', async () => {
    const input = [
      { id: 1, type: 'skill-pack-lesson' },
      { id: 2, type: 'song-tutorial-lesson' },
    ]
    const result = await mapContentsThatWereLastProgressedFromMethod(input)
    expect(result).toEqual(input)
  })
})
