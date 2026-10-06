jest.mock('../../../src/infrastructure/http/HttpClient.ts', () => ({
  __esModule: true,
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  HttpClient: jest.fn(),
}))

const HttpClient = require('../../../src/infrastructure/http/HttpClient.ts')
const { resetLearningPathCachesForTests } = require('../../../src/services/my-path/cache.ts')
const {
  myPathGetDailySession,
  createDailySession,
} = require('../../../src/services/my-path/daily-session.ts')
const {
  myPathGetActivePath,
  setActiveLearningPath,
  advanceActiveLearningPath,
} = require('../../../src/services/my-path/active-path.ts')

const userDate = new Date('2026-01-01T10:00:00Z')

const activePath = {
  user_id: 1,
  brand: 'drumeo',
  active_learning_path_id: 11,
  active_node_id: 'node-a',
  active_learning_path_created_at: 1767261600,
}

const dailySession = {
  ...activePath,
  user_date: '2026-01-01',
  daily_session: [{ content_ids: [1, 2], learning_path_id: 11, node_id: 'node-a', is_placeholder: false }],
}

const getCallsTo = (path: string) => HttpClient.GET.mock.calls.filter((call: any[]) => call[0].includes(path))

beforeEach(() => {
  resetLearningPathCachesForTests()
  HttpClient.GET.mockReset().mockResolvedValue(null)
  HttpClient.POST.mockReset()
  HttpClient.PUT.mockReset()
})

describe('myPathGetDailySession', () => {
  test('gets from the v2 daily-session endpoint', async () => {
    HttpClient.GET.mockResolvedValueOnce(dailySession)

    const result = await myPathGetDailySession('drumeo', userDate)

    expect(result).toEqual(dailySession)
    const url = HttpClient.GET.mock.calls[0][0]
    expect(url).toContain('/api/my-path/v2/daily-session?brand=drumeo&userDate=')
  })

  test('creates the daily session when none exists', async () => {
    HttpClient.GET.mockResolvedValueOnce('')
    HttpClient.POST.mockResolvedValueOnce(dailySession)

    const result = await myPathGetDailySession('drumeo', userDate)

    expect(result).toEqual(dailySession)
    expect(HttpClient.POST).toHaveBeenCalledTimes(1)
  })

  test('returns null when the user has no active path', async () => {
    HttpClient.GET.mockResolvedValueOnce('')
    HttpClient.POST.mockResolvedValueOnce('')

    expect(await myPathGetDailySession('drumeo', userDate)).toBeNull()
  })

  test('concurrent calls share a single GET', async () => {
    HttpClient.GET.mockResolvedValue(dailySession)

    await Promise.all([myPathGetDailySession('drumeo', userDate), myPathGetDailySession('drumeo', userDate)])

    expect(getCallsTo('/daily-session')).toHaveLength(1)
  })

  test('returns null and logs when GET throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    HttpClient.GET.mockRejectedValueOnce(new Error('boom'))

    expect(await myPathGetDailySession('drumeo', userDate)).toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('createDailySession', () => {
  test('posts brand, userDate and replacePlaceholdersOnly', async () => {
    HttpClient.POST.mockResolvedValueOnce(dailySession)

    const result = await createDailySession('drumeo', userDate, true)

    expect(result).toEqual(dailySession)
    const [url, body] = HttpClient.POST.mock.calls[0]
    expect(url).toBe('/api/my-path/v2/daily-session')
    expect(body).toEqual({ brand: 'drumeo', userDate: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/), replacePlaceholdersOnly: true })
  })

  test('defaults replacePlaceholdersOnly to false', async () => {
    HttpClient.POST.mockResolvedValueOnce(dailySession)

    await createDailySession('drumeo', userDate)

    expect(HttpClient.POST.mock.calls[0][1].replacePlaceholdersOnly).toBe(false)
  })

  test('returns null on an empty response and does not cache', async () => {
    HttpClient.POST.mockResolvedValueOnce('')

    expect(await createDailySession('drumeo', userDate)).toBeNull()
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })

  test('populates the daily session and active path caches', async () => {
    HttpClient.POST.mockResolvedValueOnce(dailySession)
    await createDailySession('drumeo', userDate)
    HttpClient.GET.mockClear()

    expect(await myPathGetDailySession('drumeo', userDate)).toEqual(dailySession)
    expect(await myPathGetActivePath('drumeo')).toEqual(dailySession)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })
})

describe('myPathGetActivePath', () => {
  test('gets from the v2 active-path endpoint', async () => {
    HttpClient.GET.mockResolvedValueOnce(activePath)

    expect(await myPathGetActivePath('drumeo')).toEqual(activePath)
    expect(HttpClient.GET.mock.calls[0][0]).toBe('/api/my-path/v2/active-path?brand=drumeo')
  })

  test('returns null when the user has no active path', async () => {
    HttpClient.GET.mockResolvedValueOnce('')

    expect(await myPathGetActivePath('drumeo')).toBeNull()
  })

  test('concurrent calls share a single GET', async () => {
    HttpClient.GET.mockResolvedValue(activePath)

    await Promise.all([myPathGetActivePath('drumeo'), myPathGetActivePath('drumeo')])

    expect(getCallsTo('/active-path')).toHaveLength(1)
  })
})

describe('setActiveLearningPath', () => {
  test('puts the active path and returns the new daily session', async () => {
    HttpClient.PUT.mockResolvedValueOnce(dailySession)

    const result = await setActiveLearningPath('drumeo', 11, 'node-a', userDate)

    expect(result).toEqual(dailySession)
    const [url, body] = HttpClient.PUT.mock.calls[0]
    expect(url).toBe('/api/my-path/v2/active-path')
    expect(body).toEqual({
      brand: 'drumeo',
      learning_path_id: 11,
      node_id: 'node-a',
      userDate: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/),
    })
  })

  test('replaces cached active path and daily session', async () => {
    HttpClient.GET.mockResolvedValue({ ...activePath, active_learning_path_id: 1 })
    await myPathGetActivePath('drumeo')
    const next = { ...dailySession, active_learning_path_id: 22, active_node_id: 'node-b' }
    HttpClient.PUT.mockResolvedValueOnce(next)

    await setActiveLearningPath('drumeo', 22, 'node-b', userDate)
    HttpClient.GET.mockClear()

    expect(await myPathGetActivePath('drumeo')).toEqual(next)
    expect(await myPathGetDailySession('drumeo', userDate)).toEqual(next)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })

  test('propagates request errors and leaves the cache alone', async () => {
    HttpClient.GET.mockResolvedValue(activePath)
    await myPathGetActivePath('drumeo')
    HttpClient.PUT.mockRejectedValueOnce({ status: 422 })

    await expect(setActiveLearningPath('drumeo', 22, 'bad-node', userDate)).rejects.toEqual({ status: 422 })
    HttpClient.GET.mockClear()

    expect(await myPathGetActivePath('drumeo')).toEqual(activePath)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })
})

describe('advanceActiveLearningPath', () => {
  test('posts to the advance endpoint and caches the result', async () => {
    const next = { ...dailySession, active_learning_path_id: 12 }
    HttpClient.POST.mockResolvedValueOnce(next)

    const result = await advanceActiveLearningPath('drumeo', userDate)

    expect(result).toEqual(next)
    const [url, body] = HttpClient.POST.mock.calls[0]
    expect(url).toBe('/api/my-path/v2/active-path/advance')
    expect(body).toEqual({ brand: 'drumeo', userDate: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/) })

    HttpClient.GET.mockClear()
    expect(await myPathGetActivePath('drumeo')).toEqual(next)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })
})
