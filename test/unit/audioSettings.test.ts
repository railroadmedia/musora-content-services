import { fetchAudioSettings, updateAudioSettings } from '../../src/services/audioRecording/audioSettings'

const mockGet = jest.fn()
const mockPatch = jest.fn()

jest.mock('../../src/infrastructure/http/HttpClient', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  PATCH: (...args: unknown[]) => mockPatch(...args),
}))

const SETTINGS = {
  recording_enabled: true,
  voice_commands_enabled: false,
  help_improve_coach: false,
  help_improve_coach_updated_at: null,
  coach_feedback_enabled: false,
  lesson_audio_enabled: false,
  take_volume: 100,
  lesson_volume: 50,
  auto_gain_enabled: true,
  input_device: null,
  output_device: null,
  audio_configured_at: null,
  mic_opted_in_at: null,
}

describe('audio settings', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  test('fetches the settings', async () => {
    mockGet.mockResolvedValue(SETTINGS)

    const result = await fetchAudioSettings()

    expect(mockGet).toHaveBeenCalledWith('/api/audio-recording/v1/settings')
    expect(result).toEqual(SETTINGS)
  })

  test('sends only the changed settings', async () => {
    mockPatch.mockResolvedValue({ ...SETTINGS, recording_enabled: false })

    const result = await updateAudioSettings({ recording_enabled: false })

    expect(mockPatch).toHaveBeenCalledWith('/api/audio-recording/v1/settings', { recording_enabled: false })
    expect(result.recording_enabled).toBe(false)
  })

  test('sends the lesson audio settings', async () => {
    const changes = { lesson_audio_enabled: true, take_volume: 80, lesson_volume: 30 }
    mockPatch.mockResolvedValue({ ...SETTINGS, ...changes })

    const result = await updateAudioSettings(changes)

    expect(mockPatch).toHaveBeenCalledWith('/api/audio-recording/v1/settings', changes)
    expect(result.lesson_volume).toBe(30)
  })

  test('sends the audio configuration', async () => {
    const changes = {
      auto_gain_enabled: false,
      input_device: { id: 'mic-1', label: 'Scarlett 2i2 USB' },
      output_device: null,
    }
    mockPatch.mockResolvedValue({ ...SETTINGS, ...changes, audio_configured_at: '2026-10-16T12:00:00+00:00' })

    const result = await updateAudioSettings(changes)

    expect(mockPatch).toHaveBeenCalledWith('/api/audio-recording/v1/settings', changes)
    expect(result.input_device).toEqual({ id: 'mic-1', label: 'Scarlett 2i2 USB' })
    expect(result.audio_configured_at).toBe('2026-10-16T12:00:00+00:00')
  })

  test('records that the user completed the mic opt-in', async () => {
    mockPatch.mockResolvedValue({ ...SETTINGS, mic_opted_in_at: '2026-10-16T12:00:00+00:00' })

    const result = await updateAudioSettings({ mic_opted_in: true })

    expect(mockPatch).toHaveBeenCalledWith('/api/audio-recording/v1/settings', { mic_opted_in: true })
    expect(result.mic_opted_in_at).toBe('2026-10-16T12:00:00+00:00')
  })
})
