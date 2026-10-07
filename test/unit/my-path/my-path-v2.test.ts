jest.mock('../../../src/infrastructure/http/HttpClient.ts', () => ({
  __esModule: true,
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  HttpClient: jest.fn(),
}))

const HttpClient = require('../../../src/infrastructure/http/HttpClient.ts')
const { clearLearningPathCaches } = require('../../../src/services/my-path/cache.ts')
const {
  myPathGetDailySession,
  createDailySession,
} = require('../../../src/services/my-path/daily-session.ts')
const {
  getMyPathActivePath,
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
  clearLearningPathCaches()
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
    expect(url).toContain('/api/my-path/v2/daily-session?brand=drumeo&user_date=')
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
    expect(body).toEqual({ brand: 'drumeo', user_date: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/), replace_placeholders_only: true })
  })

  test('defaults replacePlaceholdersOnly to false', async () => {
    HttpClient.POST.mockResolvedValueOnce(dailySession)

    await createDailySession('drumeo', userDate)

    expect(HttpClient.POST.mock.calls[0][1].replace_placeholders_only).toBe(false)
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
    expect(await getMyPathActivePath('drumeo')).toEqual(dailySession)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })
})

describe('getMyPathActivePath', () => {
  test('gets from the v2 active-path endpoint', async () => {
    HttpClient.GET.mockResolvedValueOnce(activePath)

    expect(await getMyPathActivePath('drumeo')).toEqual(activePath)
    expect(HttpClient.GET.mock.calls[0][0]).toBe('/api/my-path/v2/active-path?brand=drumeo')
  })

  test('returns null when the user has no active path', async () => {
    HttpClient.GET.mockResolvedValueOnce('')

    expect(await getMyPathActivePath('drumeo')).toBeNull()
  })

  test('concurrent calls share a single GET', async () => {
    HttpClient.GET.mockResolvedValue(activePath)

    await Promise.all([getMyPathActivePath('drumeo'), getMyPathActivePath('drumeo')])

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
      user_date: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/),
    })
  })

  test('replaces cached active path and daily session', async () => {
    HttpClient.GET.mockResolvedValue({ ...activePath, active_learning_path_id: 1 })
    await getMyPathActivePath('drumeo')
    const next = { ...dailySession, active_learning_path_id: 22, active_node_id: 'node-b' }
    HttpClient.PUT.mockResolvedValueOnce(next)

    await setActiveLearningPath('drumeo', 22, 'node-b', userDate)
    HttpClient.GET.mockClear()

    expect(await getMyPathActivePath('drumeo')).toEqual(next)
    expect(await myPathGetDailySession('drumeo', userDate)).toEqual(next)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })

  test('propagates request errors and leaves the cache alone', async () => {
    HttpClient.GET.mockResolvedValue(activePath)
    await getMyPathActivePath('drumeo')
    HttpClient.PUT.mockRejectedValueOnce({ status: 422 })

    await expect(setActiveLearningPath('drumeo', 22, 'bad-node', userDate)).rejects.toEqual({ status: 422 })
    HttpClient.GET.mockClear()

    expect(await getMyPathActivePath('drumeo')).toEqual(activePath)
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
    expect(body).toEqual({ brand: 'drumeo', user_date: expect.stringMatching(/^2026-01-01 [+-]\d{2}:\d{2}$/) })

    HttpClient.GET.mockClear()
    expect(await getMyPathActivePath('drumeo')).toEqual(next)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })
})

describe('cache behaviour', () => {
  afterEach(() => jest.useRealTimers())

  test('daily sessions are cached per brand and per day', async () => {
    HttpClient.GET.mockResolvedValue(dailySession)
    const nextDay = new Date('2026-01-03T10:00:00Z')

    await myPathGetDailySession('drumeo', userDate)
    await myPathGetDailySession('drumeo', userDate)
    await myPathGetDailySession('pianote', userDate)
    await myPathGetDailySession('drumeo', nextDay)

    expect(getCallsTo('/daily-session')).toHaveLength(3)
  })

  test('empty active path responses are cached', async () => {
    HttpClient.GET.mockResolvedValue('')

    expect(await getMyPathActivePath('drumeo')).toBeNull()
    expect(await getMyPathActivePath('drumeo')).toBeNull()

    expect(getCallsTo('/active-path')).toHaveLength(1)
  })

  test('empty daily session results are cached', async () => {
    HttpClient.GET.mockResolvedValue('')
    HttpClient.POST.mockResolvedValue('')

    expect(await myPathGetDailySession('drumeo', userDate)).toBeNull()
    expect(await myPathGetDailySession('drumeo', userDate)).toBeNull()

    expect(getCallsTo('/daily-session')).toHaveLength(1)
    expect(HttpClient.POST).toHaveBeenCalledTimes(1)
  })

  test('a cached empty active path is replaced once one is set', async () => {
    HttpClient.GET.mockResolvedValue('')
    await getMyPathActivePath('drumeo')
    HttpClient.PUT.mockResolvedValueOnce(dailySession)

    await setActiveLearningPath('drumeo', 11, 'node-a', userDate)
    HttpClient.GET.mockClear()

    expect(await getMyPathActivePath('drumeo')).toEqual(dailySession)
    expect(HttpClient.GET).not.toHaveBeenCalled()
  })

  test('failed requests are not cached', async () => {
    HttpClient.GET.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(activePath)

    await expect(getMyPathActivePath('drumeo')).rejects.toThrow('boom')
    expect(await getMyPathActivePath('drumeo')).toEqual(activePath)
  })

  test('active path cache expires after one hour', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00Z'))
    HttpClient.GET.mockResolvedValue(activePath)

    await getMyPathActivePath('drumeo')
    jest.setSystemTime(new Date('2026-01-01T10:59:00Z'))
    await getMyPathActivePath('drumeo')
    expect(getCallsTo('/active-path')).toHaveLength(1)

    jest.setSystemTime(new Date('2026-01-01T11:01:00Z'))
    await getMyPathActivePath('drumeo')
    expect(getCallsTo('/active-path')).toHaveLength(2)
  })

  test('daily session cache expires at local midnight', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 23, 30))
    const today = new Date()
    HttpClient.GET.mockResolvedValue(dailySession)

    await myPathGetDailySession('drumeo', today)
    jest.setSystemTime(new Date(2026, 0, 2, 0, 5))
    await myPathGetDailySession('drumeo', today)

    expect(getCallsTo('/daily-session')).toHaveLength(2)
  })
})
