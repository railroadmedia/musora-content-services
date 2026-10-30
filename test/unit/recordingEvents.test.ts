jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockPost = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: (...args: unknown[]) => mockPost(...args),
}))

import { logRateChangeEvent, logResumeEvent } from '../../src/services/audioRecording/recordingEvents'

describe('recording events', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost.mockResolvedValue({})
  })

  test('logs a resume at the video position and recording position where the audio picks up', async () => {
    await logResumeEvent('user-audio/1_2026-10-30_120000_abc123/', 82600, {
      audio_ms: 37965,
      chunk_index: 9,
      at: 1793300000000,
    })

    expect(mockPost).toHaveBeenCalledWith('/api/audio-recording/v1/event', {
      folder: 'user-audio/1_2026-10-30_120000_abc123/',
      type: 'resume',
      video_time_ms: 82600,
      elapsed_ms: null,
      at: 1793300000000,
      audio_ms: 37965,
      chunk_index: 9,
    })
  })

  test('logs a resume without a recording position', async () => {
    await logResumeEvent('user-audio/1_2026-10-30_120000_abc123/', 82600)

    expect(mockPost).toHaveBeenCalledWith(
      '/api/audio-recording/v1/event',
      expect.objectContaining({ type: 'resume', video_time_ms: 82600, elapsed_ms: null })
    )
  })

  test('logs a speed change with the rates before and after', async () => {
    await logRateChangeEvent('user-audio/1_2026-10-30_120000_abc123/', 1, 0.5, 27227, { audio_ms: 21027 })

    expect(mockPost).toHaveBeenCalledWith(
      '/api/audio-recording/v1/event',
      expect.objectContaining({ type: 'rate_change', from_rate: 1, to_rate: 0.5, video_time_ms: 27227, audio_ms: 21027 })
    )
  })
})
