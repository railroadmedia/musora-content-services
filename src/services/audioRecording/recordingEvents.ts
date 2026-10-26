import { logEvent, RecordingEventPosition } from './audioRecording'

export type { RecordingEventPosition }

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
