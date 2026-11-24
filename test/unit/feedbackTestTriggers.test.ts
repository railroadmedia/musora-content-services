const mockPost = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: (...args: unknown[]) => mockPost(...args),
}))
jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

import { generateFeedback } from '../../src/services/audioRecording/feedbackTestTriggers'

describe('generateFeedback', () => {
  beforeEach(() => mockPost.mockReset())

  test("asks for a lesson's feedback by content id", async () => {
    const queued = { surface: 'lesson', content_id: 452482, audio_session_id: 912 }
    mockPost.mockResolvedValue(queued)

    const result = await generateFeedback({ surface: 'lesson', contentId: 452482 })

    expect(mockPost).toHaveBeenCalledWith('/api/audio-recording/v1/feedback/generate', {
      surface: 'lesson',
      content_id: 452482,
    })
    expect(result).toEqual(queued)
  })

  test('asks for a past day and the current week', async () => {
    mockPost.mockResolvedValue({})

    await generateFeedback({ surface: 'daily', date: '2026-11-18' })
    await generateFeedback({ surface: 'weekly' })

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/audio-recording/v1/feedback/generate', {
      surface: 'daily',
      date: '2026-11-18',
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/audio-recording/v1/feedback/generate', {
      surface: 'weekly',
    })
  })
})
