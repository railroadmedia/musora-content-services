import { logEvent } from './audioRecording.js'

export interface RecordingEventPosition {
  audio_ms?: number
  chunk_index?: number
  at?: number
}

/**
 * The recorder closes the current chunk at a speed change, so every chunk records at a single
 * `playback_rate`.
 */
export async function logRateChangeEvent(
  folder: string,
  fromRate: number,
  toRate: number,
  videoTimeMs: number,
  position: RecordingEventPosition = {}
): Promise<unknown> {
  return logEvent(folder, 'rate_change', videoTimeMs, null, {
    from_rate: fromRate,
    to_rate: toRate,
    ...position,
  })
}
