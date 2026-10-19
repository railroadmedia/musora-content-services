import { initializeTestService } from '../../initializeTests.js'
import { getHierarchies, getHierarchy } from '../../../src/services/sanity.js'
import { COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'
import { globalConfig } from '../../../src/services/config.js'

jest.mock('../../../src/services/permissions/index.ts', () => ({
  ...jest.requireActual('../../../src/services/permissions/index.ts'),
  getPermissionsAdapter: jest.fn().mockReturnValue({
    fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
    isAdmin: jest.fn().mockReturnValue(false),
    hasAllContentAccess: jest.fn().mockReturnValue(false),
    generatePermissionsFilter: jest.fn().mockReturnValue(''),
  }),
}))

const THIRTY_ONE_MINUTES = 31 * 60 * 1000

const sanityResponse = (result: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) })

const networkFailure = () => Promise.reject(new TypeError('Network request failed'))

function course(courseId: number, lessonIds: number[]) {
  return {
    railcontent_id: courseId,
    metadata: { brand: 'drumeo', type: 'course', parent_id: 0 },
    children: lessonIds.map((lessonId) => ({
      railcontent_id: lessonId,
      metadata: { brand: 'drumeo', type: 'course-lesson', parent_id: courseId },
    })),
  }
}

function mockSanity(courseId: number, lessonIds: number[]) {
  return jest.fn((url: string) => {
    const query = decodeURIComponent(url)
    if (query.includes("'top_parent'")) {
      return sanityResponse(lessonIds.map((id) => ({ railcontent_id: id, top_parent: courseId })))
    }
    return sanityResponse([course(courseId, lessonIds)])
  })
}

describe('getHierarchy session cache', () => {
  beforeEach(() => {
    process.env.SANITY_API_TOKEN = 'test-token'
    process.env.SANITY_PROJECT_ID = 'test-project'
    process.env.SANITY_DATASET = 'test'
    initializeTestService()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.useFakeTimers({
      now: new Date('2026-10-19T10:00:00Z'),
      doNotFake: ['setTimeout', 'setInterval', 'nextTick', 'setImmediate', 'queueMicrotask'],
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('a repeat lookup for the same content makes no Sanity request', async () => {
    global.fetch = mockSanity(71000, [71001]) as any
    const first = await getHierarchy(71001, null)
    const requestsAfterFirst = (global.fetch as jest.Mock).mock.calls.length

    const second = await getHierarchy(71001, null)

    expect(first?.parents[71001]).toBe(71000)
    expect(second).toEqual(first)
    expect(global.fetch).toHaveBeenCalledTimes(requestsAfterFirst)
  })

  test('a lookup with the network down returns the cached hierarchy', async () => {
    global.fetch = mockSanity(71010, [71011]) as any
    const cached = await getHierarchy(71011, null)

    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy(71011, null)).toEqual(cached)
  })

  test('a lookup after a 30 minute gap refetches', async () => {
    global.fetch = mockSanity(71020, [71021]) as any
    await getHierarchy(71021, null)

    jest.setSystemTime(Date.now() + THIRTY_ONE_MINUTES)
    global.fetch = mockSanity(71020, [71021, 71022]) as any
    const refreshed = await getHierarchy(71021, null)

    expect(global.fetch).toHaveBeenCalled()
    expect(refreshed?.parents[71022]).toBe(71020)
  })

  test('a failed refetch after a 30 minute gap returns the cached hierarchy', async () => {
    global.fetch = mockSanity(71030, [71031]) as any
    const cached = await getHierarchy(71031, null)

    jest.setSystemTime(Date.now() + THIRTY_ONE_MINUTES)
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy(71031, null)).toEqual(cached)
    expect(global.fetch).toHaveBeenCalled()
  })

  test('an empty refetch is returned as null, not masked by the cached hierarchy', async () => {
    global.fetch = mockSanity(71040, [71041]) as any
    await getHierarchy(71041, null)

    jest.setSystemTime(Date.now() + THIRTY_ONE_MINUTES)
    global.fetch = jest.fn(() => sanityResponse([])) as any

    expect(await getHierarchy(71041, null)).toBeNull()
  })

  test('an empty result is not cached', async () => {
    global.fetch = jest.fn(() => sanityResponse([])) as any
    expect(await getHierarchy(71051, null)).toBeNull()

    global.fetch = mockSanity(71050, [71051]) as any
    expect((await getHierarchy(71051, null))?.parents[71051]).toBe(71050)
  })

  test('a failed lookup with nothing cached resolves null', async () => {
    global.fetch = jest.fn(networkFailure) as any
    expect(await getHierarchy(71061, null)).toBeNull()
  })

  test('a lookup for different content drops the cached hierarchy', async () => {
    global.fetch = mockSanity(71070, [71071]) as any
    await getHierarchy(71071, null)
    global.fetch = mockSanity(71080, [71081]) as any
    expect((await getHierarchy(71081, null))?.parents[71081]).toBe(71080)

    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy(71071, null)).toBeNull()
  })

  test('a lookup in another collection does not reuse the cached hierarchy', async () => {
    global.fetch = mockSanity(71090, [71091]) as any
    await getHierarchy(71091, null)

    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy(71091, { type: COLLECTION_TYPE.PLAYLIST, id: 5 })).toBeNull()
  })

  test('a learning-path lookup with the network down returns the cached hierarchy', async () => {
    const learningPath = { type: COLLECTION_TYPE.LEARNING_PATH, id: 71100 }
    global.fetch = jest.fn(() => sanityResponse([course(71100, [71101])])) as any
    const cached = await getHierarchy(71101, learningPath)

    jest.setSystemTime(Date.now() + THIRTY_ONE_MINUTES)
    global.fetch = jest.fn(networkFailure) as any

    expect(cached?.parents[71101]).toBe(71100)
    expect(await getHierarchy(71101, learningPath)).toEqual(cached)
  })

  test('a bulk lookup within the cached hierarchy makes no Sanity request', async () => {
    global.fetch = mockSanity(71110, [71111, 71112]) as any
    const cached = await getHierarchy(71111, null)
    global.fetch = jest.fn(networkFailure) as any

    const hierarchies = await getHierarchies([71111, 71112], null)

    expect(hierarchies).toEqual({ 71111: cached, 71112: cached })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('a failed bulk lookup outside the cached hierarchy resolves null', async () => {
    global.fetch = mockSanity(71120, [71121]) as any
    await getHierarchy(71121, null)
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchies([71121, 71999], null)).toBeNull()
  })

  test('each cache hit restarts the 30 minute idle window', async () => {
    global.fetch = mockSanity(71150, [71151]) as any
    await getHierarchy(71151, null)
    jest.setSystemTime(Date.now() + 20 * 60 * 1000)
    await getHierarchy(71151, null)
    const requestsBeforeLastLookup = (global.fetch as jest.Mock).mock.calls.length

    jest.setSystemTime(Date.now() + 20 * 60 * 1000)
    await getHierarchy(71151, null)

    expect(global.fetch).toHaveBeenCalledTimes(requestsBeforeLastLookup)
  })

  test('a string content id shares the cached hierarchy of its numeric id', async () => {
    global.fetch = mockSanity(71160, [71161]) as any
    const cached = await getHierarchy(71161, null)
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy('71161', null)).toEqual(cached)
  })

  test('a bulk lookup with nothing cached returns a hierarchy per content id', async () => {
    global.fetch = mockSanity(71170, [71171, 71172]) as any

    const hierarchies = await getHierarchies([71171, 71172], null)

    expect(hierarchies?.[71171]?.parents[71171]).toBe(71170)
    expect(hierarchies?.[71172]?.parents[71172]).toBe(71170)
  })

  test('a failed bulk lookup after a 30 minute gap returns the cached hierarchy', async () => {
    global.fetch = mockSanity(71180, [71181, 71182]) as any
    const cached = await getHierarchy(71181, null)

    jest.setSystemTime(Date.now() + THIRTY_ONE_MINUTES)
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchies([71181, 71182], null)).toEqual({ 71181: cached, 71182: cached })
    expect(global.fetch).toHaveBeenCalled()
  })

  test('a bulk lookup in another collection does not reuse the cached hierarchy', async () => {
    global.fetch = mockSanity(71190, [71191]) as any
    await getHierarchy(71191, null)
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchies([71191], { type: COLLECTION_TYPE.PLAYLIST, id: 5 })).toBeNull()
  })

  test('a lookup that fails while building the hierarchy logs the error', async () => {
    global.fetch = jest.fn((url: string) =>
      decodeURIComponent(url).includes("'top_parent'")
        ? sanityResponse([{ railcontent_id: 71141, top_parent: 71140 }])
        : sanityResponse([{ railcontent_id: 71140, children: [null] }])
    ) as any

    expect(await getHierarchy(71141, null)).toBeNull()
    expect(await getHierarchies([71141], null)).toBeNull()
    expect(console.error).toHaveBeenCalledWith('getHierarchy: lookup failed', expect.any(TypeError))
    expect(console.error).toHaveBeenCalledWith(
      'getHierarchies: lookup failed',
      expect.any(TypeError)
    )
  })

  test('a lookup for another user does not reuse the cached hierarchy', async () => {
    global.fetch = mockSanity(71130, [71131]) as any
    await getHierarchy(71131, null)
    globalConfig.sessionConfig = { ...globalConfig.sessionConfig, userId: 'another-user' }
    global.fetch = jest.fn(networkFailure) as any

    expect(await getHierarchy(71131, null)).toBeNull()
    expect(await getHierarchies([71131], null)).toBeNull()
  })
})
