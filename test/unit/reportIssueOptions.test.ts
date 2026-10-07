const mockPost = jest.fn()

jest.mock('../../src/infrastructure/http/HttpClient', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({ post: mockPost })),
}))
jest.mock('../../src/services/contentAggregator', () => ({ addContextToContent: jest.fn() }))
jest.mock('../../src/services/sanity', () => ({
  fetchByRailContentId: jest.fn(),
  fetchByRailContentIds: jest.fn(),
}))
jest.mock('../../src/services/urlBuilder', () => ({
  generateContentUrl: jest.fn(),
  generatePlaylistUrl: jest.fn(),
  generateForumPostUrl: jest.fn(),
  generateCommentUrl: jest.fn(),
}))

import { getReportIssueOptions, report } from '../../src/services/reporting/reporting'
import { addContextToContent } from '../../src/services/contentAggregator'

const optionValues = (...args: Parameters<typeof getReportIssueOptions>) =>
  getReportIssueOptions(...args).map((option) => option.value)

describe('getReportIssueOptions', () => {
  test('offers the recording issue, just before other reasons, when the user has recordings on the lesson', () => {
    expect(optionValues('content', false, true).slice(-2)).toEqual(['recording_issue', 'other'])
    expect(
      getReportIssueOptions('content', false, true).find(
        (option) => option.value === 'recording_issue'
      )
    ).toEqual({ value: 'recording_issue', label: 'Recording playback or sharing issue' })
  })

  test('offers the recording issue on mobile too', () => {
    expect(optionValues('content', true, true)).toContain('recording_issue')
  })

  test('does not offer the recording issue by default', () => {
    expect(optionValues('content')).not.toContain('recording_issue')
    expect(optionValues('content', true)).not.toContain('recording_issue')
  })

  test('does not offer the recording issue for playlists', () => {
    expect(optionValues('playlist', false, true)).not.toContain('recording_issue')
  })
})

describe('report', () => {
  beforeEach(() => {
    mockPost.mockReset().mockResolvedValue({ report_id: 1 })
    ;(addContextToContent as jest.Mock).mockResolvedValue([])
  })

  test("sends the take's folder when reporting a recording from its own menu", async () => {
    await report({
      type: 'content',
      id: 42,
      issue: 'recording_issue',
      brand: 'drumeo',
      recordingFolder: 'user-audio/1_2026-10-07_100000_abc/',
    })

    expect(mockPost).toHaveBeenCalledWith(
      '/api/user-reports/v1/reports',
      expect.objectContaining({
        issue: 'recording_issue',
        recording_folder: 'user-audio/1_2026-10-07_100000_abc/',
      })
    )
  })

  test('leaves the folder out when reporting from a lesson-level menu', async () => {
    await report({ type: 'content', id: 42, issue: 'recording_issue', brand: 'drumeo' })

    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('recording_folder')
  })
})
