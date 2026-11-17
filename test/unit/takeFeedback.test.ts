jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  POST: (...args: unknown[]) => mockPost(...args),
}))

import { getFeedbackStatus, requestFeedback } from '../../src/services/audioRecording/audioRecording'

const folder = 'user-audio/1_2026-11-12_101010_abcdef/'

describe('take feedback', () => {
  test('requests feedback for several takes in one call', async () => {
    const response = {
      requested: [{ folder, take_number: 2, name: null, feedback_state: 'reviewing' }],
      rejected: [{ folder: 'user-audio/1_2026-11-12_111111_ghijkl/', reason: 'ineligible' }],
    }
    mockPost.mockResolvedValue(response)

    const result = await requestFeedback([folder, 'user-audio/1_2026-11-12_111111_ghijkl/'])

    expect(mockPost).toHaveBeenCalledWith('/api/audio-recording/v1/feedback', {
      folders: [folder, 'user-audio/1_2026-11-12_111111_ghijkl/'],
    })
    expect(result).toEqual(response)
  })

  test('returns the rejected takes when none of them can be requested', async () => {
    const rejected = [{ folder, reason: 'ineligible' }]
    mockPost.mockRejectedValue({ status: 422, body: { additional_details: { rejected } } })

    const result = await requestFeedback([folder])

    expect(result).toEqual({ requested: [], rejected })
  })

  test('throws when the Feedback setting is off', async () => {
    const error = {
      status: 422,
      body: {
        title: 'Feedback is turned off in the audio settings.',
        additional_details: { rejected: [] },
      },
    }
    mockPost.mockRejectedValue(error)

    await expect(requestFeedback([folder])).rejects.toBe(error)
  })

  test("fetches the take's feedback state by folder", async () => {
    const response = { feedback_state: 'reviewing', feedback: null, job: null }
    mockGet.mockResolvedValue(response)

    const result = await getFeedbackStatus(folder)

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/feedback?folder=user-audio%2F1_2026-11-12_101010_abcdef%2F'
    )
    expect(result).toEqual(response)
  })
})
