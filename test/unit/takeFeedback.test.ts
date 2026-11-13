jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockGet = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  POST: jest.fn(),
}))

import { getTakeFeedback } from '../../src/services/audioRecording/audioRecording'

describe('getTakeFeedback', () => {
  test("fetches the take's feedback by folder", async () => {
    const feedback = {
      folder: 'user-audio/1_2026-11-12_101010_abcdef/',
      take_number: 2,
      name: null,
      body: 'Steady hands on bar 4.',
      created_at: '2026-11-12T10:00:00+00:00',
    }
    mockGet.mockResolvedValue({ feedback })

    const result = await getTakeFeedback('user-audio/1_2026-11-12_101010_abcdef/')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/take-feedback?folder=user-audio%2F1_2026-11-12_101010_abcdef%2F'
    )
    expect(result).toEqual({ feedback })
  })
})
