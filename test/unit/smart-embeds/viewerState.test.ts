import {
  getViewerState,
  getViewerStates,
  enrichWithViewerState,
} from '../../../src/services/smart-embeds/viewerState'
import { SmartEmbedContent, SmartEmbedResult } from '../../../src/services/smart-embeds/types'

jest.mock('../../../src/services/contentProgress.js', () => ({
  getProgressStateByIds: jest.fn(),
}))

jest.mock('../../../src/services/permissions/index', () => ({
  getPermissionsAdapter: jest.fn(() => ({
    fetchUserPermissions: jest.fn(),
    doesUserNeedAccess: jest.fn(),
  })),
}))

const { getProgressStateByIds } = require('../../../src/services/contentProgress.js')
const { getPermissionsAdapter } = require('../../../src/services/permissions/index')

const mockContent: SmartEmbedContent = {
  id: 123,
  sanityId: 'sanity-123',
  title: 'Test Content',
  type: 'song',
  thumbnail: 'https://example.com/thumb.jpg',
  instructorName: null,
  artistName: 'Test Artist',
  difficulty: 'Intermediate',
  lengthInSeconds: 300,
  brand: 'drumeo',
  slug: 'test-content',
  permissionId: 91,
  membershipTier: null,
  publishedOn: '2024-01-01',
  status: 'published',
}

describe('getViewerState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns started progress state', async () => {
    const progressMap = new Map([[123, 'started']])
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [91], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(false),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const result = await getViewerState(123, mockContent)

    expect(result.progressState).toBe('started')
    expect(result.needsAccess).toBe(false)
  })

  test('returns completed progress state', async () => {
    const progressMap = new Map([[123, 'completed']])
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [91], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(false),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const result = await getViewerState(123, mockContent)

    expect(result.progressState).toBe('completed')
  })

  test('returns empty progress state for no progress', async () => {
    const progressMap = new Map()
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(false),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const result = await getViewerState(123, mockContent)

    expect(result.progressState).toBe('')
  })

  test('returns needsAccess true when user lacks permission', async () => {
    const progressMap = new Map()
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(true),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const result = await getViewerState(123, mockContent)

    expect(result.needsAccess).toBe(true)
  })

  test('returns membershipRequired true for plus content', async () => {
    const plusContent: SmartEmbedContent = {
      ...mockContent,
      membershipTier: 'plus',
    }

    const progressMap = new Map()
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(true),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const result = await getViewerState(123, plusContent)

    expect(result.membershipRequired).toBe(true)
  })
})

describe('getViewerStates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns states for multiple contents', async () => {
    const progressMap = new Map([
      [123, 'started'],
      [456, 'completed'],
    ])
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [91], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(false),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const content2: SmartEmbedContent = { ...mockContent, id: 456 }
    const results = await getViewerStates([123, 456], [mockContent, content2])

    expect(results.get(123)?.progressState).toBe('started')
    expect(results.get(456)?.progressState).toBe('completed')
  })

  test('returns empty map for empty input', async () => {
    const results = await getViewerStates([], [])
    expect(results.size).toBe(0)
  })
})

describe('enrichWithViewerState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('enriches embed results with viewer state', async () => {
    const progressMap = new Map([[123, 'started']])
    getProgressStateByIds.mockResolvedValue(progressMap)

    const mockAdapter = {
      fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [91], isAdmin: false }),
      doesUserNeedAccess: jest.fn().mockReturnValue(false),
    }
    getPermissionsAdapter.mockReturnValue(mockAdapter)

    const embedResults: SmartEmbedResult[] = [
      {
        content: mockContent,
        originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
      },
    ]

    const enriched = await enrichWithViewerState(embedResults)

    expect(enriched).toHaveLength(1)
    expect(enriched[0].viewerState.progressState).toBe('started')
    expect(enriched[0].viewerState.needsAccess).toBe(false)
  })

  test('returns empty array for empty input', async () => {
    const results = await enrichWithViewerState([])
    expect(results).toEqual([])
  })
})
