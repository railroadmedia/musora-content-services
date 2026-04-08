import {
  getProgressState,
  getProgressStateByIds,
  getAllStarted,
  getAllStartedOrCompleted,
} from '../src/services/contentProgress'
import { initializeTestService } from './initializeTests'
import {getTabResults} from "../src/services/content";
import {tutorialsLessonTypes, transcriptionsLessonTypes, playAlongLessonTypes} from "../src/contentTypeConfig";

let mockProgressRecords = []

jest.mock('../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getOneProgressByContentId: jest.fn().mockImplementation((contentId) => {
        const record = mockProgressRecords.find(r => r.content_id === contentId)
        return Promise.resolve({ data: record || null })
      }),
      getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds) => {
        const records = mockProgressRecords.filter(r => contentIds.includes(r.content_id))
        return Promise.resolve({ data: records })
      }),
      started: jest.fn().mockImplementation((limit, opts) => {
        const startedIds = mockProgressRecords
          .filter(r => r.state === 'started')
          .sort((a, b) => b.updated_at - a.updated_at)
          .map(r => r.content_id)
        const result = limit ? startedIds.slice(0, limit) : startedIds
        return Promise.resolve(opts?.onlyIds !== false ? result : result.map(id => ({ content_id: id })))
      }),
      startedOrCompleted: jest.fn().mockImplementation(() => {
        const records = mockProgressRecords
          .filter(r => r.state === 'started' || r.state === 'completed')
          .sort((a, b) => b.updated_at - a.updated_at)
        return Promise.resolve({ data: records })
      }),
    },
    practices: {
      queryAll: jest.fn().mockResolvedValue({ data: [] }),
      getAll: jest.fn().mockResolvedValue({ data: [] }),
    },
  }
  return { default: mockFns, ...mockFns }
})

jest.mock('../src/services/railcontent', () => ({
  ...jest.requireActual('../src/services/railcontent'),
  fetchUserPermissionsData: jest.fn(() => ({ permissions: [78, 91, 92], isAdmin: false }))
}))

describe('contentProgressDataContext', function () {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 234191, state: 'started',   progress_percent: 6,   updated_at: 1731108082, last_interacted_a_la_carte: 1731108082 },
      { content_id: 233955, state: 'started',   progress_percent: 1,   updated_at: 1731108083 },
      { content_id: 259426, state: 'completed', progress_percent: 100, updated_at: 1731108085 },
      { content_id: 190417, state: 'started',   progress_percent: 6,   updated_at: 1731108082 },
      { content_id: 407665, state: 'started',   progress_percent: 6,   updated_at: 1740120139 },
      { content_id: 412986, state: 'completed', progress_percent: 100, updated_at: 1731108085 },
    ]
  })

  test('getProgressState', async () => {
    let result = await getProgressState(234191)
    expect(result).toBe('started')
  })

  test('getProgressState_notExists', async () => {
    let result = await getProgressState(111111)
    expect(result).toBe('')
  })

  test('getAllStarted', async () => {
    let result = await getAllStarted()
    expect(result).toStrictEqual([407665, 233955, 234191, 190417])

    result = await getAllStarted(1)
    expect(result).toStrictEqual([407665])
  })

  test('getAllStartedOrCompleted', async () => {
    let result = await getAllStartedOrCompleted()
    expect(result).toStrictEqual([407665, 259426, 412986, 233955, 234191, 190417])
  })

  test.skip('get-Songs-Tutorials', async () => {
    const result = await getTabResults('pianote', 'songs', 'Tutorials')
    expect(result.type).toStrictEqual('catalog')
    expect(result.data).toBeDefined()
    expect(tutorialsLessonTypes).toContain(result.data[0].type)
  })

  test.skip('get-Songs-Transcriptions', async () => {
    const result = await getTabResults('pianote', 'songs', 'Transcriptions')
    expect(result.type).toStrictEqual('catalog')
    expect(result.data).toBeDefined()
    expect(transcriptionsLessonTypes).toContain(result.data[0].type)
  })

  test.skip('get-Songs-Play-Alongs', async () => {
    const result = await getTabResults('drumeo', 'songs', 'Play-Alongs', { selectedFilters: ['difficulty,Expert'] })
    expect(playAlongLessonTypes).toContain(result.data[0].type)
    expect(result.data[0].difficulty_string).toStrictEqual('Expert')
  })
})
