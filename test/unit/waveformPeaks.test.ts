const mockGet = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  POST: jest.fn(),
}))
jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

import { downsamplePeaks, getWaveformPeaks } from '../../src/services/audioRecording/waveformPeaks'

describe('downsamplePeaks', () => {
  test('keeps the loudest peak of each bucket', () => {
    expect(downsamplePeaks([0.1, 0.9, 0.2, 0.4, 0.3, 0.12345], 3)).toEqual([0.9, 0.4, 0.3])
  })

  test('returns the peaks as they are when there are no more than the target count', () => {
    const peaks = [0.1, 0.2]

    expect(downsamplePeaks(peaks, 5)).toBe(peaks)
  })
})

describe('getWaveformPeaks', () => {
  beforeEach(() => mockGet.mockReset())

  test('returns the stored peaks of a take', async () => {
    mockGet.mockResolvedValue({ peaks: [0.1, 0.5] })

    const result = await getWaveformPeaks('user-audio/1_2026-10-16_120000_abcdef/')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/waveform?folder=user-audio%2F1_2026-10-16_120000_abcdef%2F'
    )
    expect(result).toEqual([0.1, 0.5])
  })

  test('returns null when the take has no stored peaks', async () => {
    mockGet.mockResolvedValue({ peaks: [] })

    expect(await getWaveformPeaks('folder')).toBeNull()
  })

  test('returns null when the request fails', async () => {
    mockGet.mockRejectedValue(new Error('404'))

    expect(await getWaveformPeaks('folder')).toBeNull()
  })
})
