import { getRecordingPlaybackUrl } from '../../src/services/audioRecording/playbackUrl'

const mockGet = jest.fn()

jest.mock('../../src/infrastructure/http/HttpClient', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
}))

describe('getRecordingPlaybackUrl', () => {
  beforeEach(() => mockGet.mockReset())

  test('asks for the playback copy by default', async () => {
    mockGet.mockResolvedValue({ url: 'https://signed', expires_at: null, mime_type: 'audio/mp4' })

    const result = await getRecordingPlaybackUrl('user-audio/1_2026-09-24_120000/')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/playback-url?folder=user-audio%2F1_2026-09-24_120000%2F'
    )
    expect(result.url).toBe('https://signed')
  })

  test('passes the original and download flags', async () => {
    mockGet.mockResolvedValue({ url: null, expires_at: null, mime_type: null })

    await getRecordingPlaybackUrl('user-audio/1_2026-09-24_120000/', { original: true, download: true })

    expect(mockGet.mock.calls[0][0]).toContain('format=original')
    expect(mockGet.mock.calls[0][0]).toContain('download=1')
  })
})
