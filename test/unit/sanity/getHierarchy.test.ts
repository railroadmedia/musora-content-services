import { initializeTestService } from '../../initializeTests.js'
import { getHierarchy } from '../../../src/services/sanity.js'

jest.mock('../../../src/services/permissions/index.ts', () => ({
  ...jest.requireActual('../../../src/services/permissions/index.ts'),
  getPermissionsAdapter: jest.fn().mockReturnValue({
    fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
    isAdmin: jest.fn().mockReturnValue(false),
    hasAllContentAccess: jest.fn().mockReturnValue(false),
    generatePermissionsFilter: jest.fn().mockReturnValue(''),
  }),
}))

const sanityResponse = (result: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) })

function mockSanity(courseId: number, lessonId: number) {
  return jest.fn((url: string) => {
    const query = decodeURIComponent(url)
    if (query.includes("'top_parent'")) return sanityResponse([{ top_parent: courseId }])
    return sanityResponse([
      {
        railcontent_id: courseId,
        metadata: { brand: 'drumeo', type: 'course', parent_id: 0 },
        children: [
          { railcontent_id: lessonId, metadata: { brand: 'drumeo', type: 'course-lesson', parent_id: courseId } },
        ],
      },
    ])
  })
}

describe('getHierarchy', () => {
  beforeEach(() => {
    process.env.SANITY_API_TOKEN = 'test-token'
    process.env.SANITY_PROJECT_ID = 'test-project'
    process.env.SANITY_DATASET = 'test'
    initializeTestService()
  })

  test('reuses the hierarchy for repeat lookups of the same content', async () => {
    global.fetch = mockSanity(70000, 70001) as any
    const first = await getHierarchy(70001, null)
    const second = await getHierarchy(70001, null)
    expect(first?.parents[70001]).toBe(70000)
    expect(second).toEqual(first)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  test('does not cache a failed lookup', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch'))) as any
    expect(await getHierarchy(70011, null)).toBeNull()

    global.fetch = mockSanity(70010, 70011) as any
    const hierarchy = await getHierarchy(70011, null)
    expect(hierarchy?.parents[70011]).toBe(70010)
  })

  test('fetches separately for different content', async () => {
    global.fetch = mockSanity(70020, 70021) as any
    await getHierarchy(70021, null)
    global.fetch = mockSanity(70030, 70031) as any
    const other = await getHierarchy(70031, null)
    expect(other?.parents[70031]).toBe(70030)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
