jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockGet = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  POST: jest.fn(),
}))

import {
  getDailyFeedback,
  getWeeklyFeedback,
} from '../../src/services/audioRecording/audioRecording'

describe('practice feedback', () => {
  test("fetches a day's feedback by date", async () => {
    const response = {
      feedback: { body: 'Great day.', created_at: '2026-10-13T07:01:00+00:00', summary: null },
    }
    mockGet.mockResolvedValue(response)

    const result = await getDailyFeedback('2026-10-12')

    expect(mockGet).toHaveBeenCalledWith('/api/audio-recording/v1/daily-feedback?date=2026-10-12')
    expect(result).toEqual(response)
  })

  test("fetches a week's feedback by its Monday", async () => {
    mockGet.mockResolvedValue({ feedback: null })

    const result = await getWeeklyFeedback('2026-10-05')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/weekly-feedback?week_start=2026-10-05'
    )
    expect(result).toEqual({ feedback: null })
  })
})
