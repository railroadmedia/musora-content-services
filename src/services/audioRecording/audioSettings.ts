import { GET, PATCH } from '../../infrastructure/http/HttpClient'

export interface AudioDevice {
  id: string
  label: string | null
}

export interface AudioSettings {
  recording_enabled: boolean
  voice_commands_enabled: boolean
  help_improve_coach: boolean
  help_improve_coach_updated_at: string | null
  coach_feedback_enabled: boolean
  lesson_audio_enabled: boolean
  take_volume: number
  lesson_volume: number
  auto_gain_enabled: boolean
  input_volume: number
  musora_volume: number
  input_device: AudioDevice | null
  output_device: AudioDevice | null
  audio_configured_at: string | null
  mic_opted_in_at: string | null
  mic_opt_in_prompted_at: string | null
  mic_access_granted_at: string | null
  audio_setup_toast_shown_at: string | null
}

export type AudioSettingsChanges = Partial<
  Pick<
    AudioSettings,
    | 'recording_enabled'
    | 'voice_commands_enabled'
    | 'help_improve_coach'
    | 'coach_feedback_enabled'
    | 'lesson_audio_enabled'
    | 'take_volume'
    | 'lesson_volume'
    | 'auto_gain_enabled'
    | 'input_volume'
    | 'musora_volume'
    | 'input_device'
    | 'output_device'
  >
> & {
  mic_opted_in?: true
  mic_opt_in_prompted?: true
  mic_access_granted?: true
  audio_setup_toast_shown?: true
}

const SETTINGS_PATH = '/api/audio-recording/v1/settings'

/**
 * Resolves to the defaults when the user has never saved any setting. `recording_enabled`
 * is the user's preference only: recording still needs the device's mic permission.
 */
export async function fetchAudioSettings(): Promise<AudioSettings> {
  return GET(SETTINGS_PATH)
}

/**
 * Only the settings passed in change; the rest keep their saved (or default) values.
 */
export async function updateAudioSettings(changes: AudioSettingsChanges): Promise<AudioSettings> {
  return PATCH(SETTINGS_PATH, changes)
}
