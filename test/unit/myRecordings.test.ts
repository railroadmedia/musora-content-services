jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))
jest.mock('../../src/services/my-path/learning-paths.ts', () => ({
  mapLearningPathParentsTo: jest.fn(),
}))
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}))

import { getMyRecordings } from '../../src/services/audioRecording/audioRecording'
import { GET } from '../../src/infrastructure/http/HttpClient'
import { fetchByRailContentIds } from '../../src/services/sanity.js'
import { decorateAsync } from '../../src/lib/sanity/decorators/base'
import { mapLearningPathParentsTo } from '../../src/services/my-path/learning-paths'

const mockGet = GET as jest.Mock
const mockFetchByRailContentIds = fetchByRailContentIds as jest.Mock
const mockDecorateAsync = decorateAsync as jest.Mock
const mockMapLearningPathParentsTo = mapLearningPathParentsTo as jest.Mock

const META = { current_page: 2, last_page: 3, per_page: 10, total: 25 }

describe('getMyRecordings', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('requests the first page of 20 by default', async () => {
    mockGet.mockResolvedValue({ data: [], meta: { ...META, current_page: 1 } })

    await getMyRecordings()

    expect(mockGet).toHaveBeenCalledWith('/api/audio-recording/v1/my-recordings?page=1&limit=20')
  })

  test('returns the requested page decorated with its lessons mapped to their learning path, along with the pagination meta', async () => {
    const recordings = [{ content_id: 100, recording_count: 2 }]
    const lesson = { id: 100, type: 'skill-pack-lesson', brand: 'drumeo', title: 'Lesson' }
    const methodLesson = { ...lesson, type: 'learning-path-lesson-v2', parent_id: 900 }
    mockGet.mockResolvedValue({ data: recordings, meta: META })
    mockFetchByRailContentIds.mockResolvedValue([lesson])
    mockMapLearningPathParentsTo.mockResolvedValue([methodLesson])
    mockDecorateAsync.mockImplementation(async (items, key, resolve) =>
      Promise.all(items.map(async (item) => ({ ...item, [key]: await resolve(item) })))
    )

    const result = await getMyRecordings({ page: 2, limit: 10 })

    expect(mockGet).toHaveBeenCalledWith('/api/audio-recording/v1/my-recordings?page=2&limit=10')
    expect(mockFetchByRailContentIds).toHaveBeenCalledWith([100])
    expect(mockMapLearningPathParentsTo).toHaveBeenCalledWith([lesson], {
      type: true,
      parent_id: true,
    })
    expect(result).toEqual({
      recordings: [{ content_id: 100, recording_count: 2, content: methodLesson }],
      meta: META,
    })
  })

  test('skips the Sanity lookup for an empty page', async () => {
    const meta = { current_page: 4, last_page: 3, per_page: 10, total: 25 }
    mockGet.mockResolvedValue({ data: [], meta })

    const result = await getMyRecordings({ page: 4, limit: 10 })

    expect(mockFetchByRailContentIds).not.toHaveBeenCalled()
    expect(result).toEqual({ recordings: [], meta })
  })
})
