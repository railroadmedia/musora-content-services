import { GET, PATCH } from '../../infrastructure/http/HttpClient'

export interface AudioSettings {
  recording_enabled: boolean
  voice_commands_enabled: boolean
  help_improve_coach: boolean
  help_improve_coach_updated_at: string | null
  coach_feedback_enabled: boolean
}

export type AudioSettingsChanges = Partial<
  Pick<
    AudioSettings,
    'recording_enabled' | 'voice_commands_enabled' | 'help_improve_coach' | 'coach_feedback_enabled'
  >
>

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
