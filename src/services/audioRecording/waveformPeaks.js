/**
 * Waveform Peaks
 * Only the platform-agnostic pieces live here: downsampling a peaks array and fetching
 * the peaks stored for a recording. Capturing/generating/drawing peaks depends on Web
 * Audio API + Canvas, which aren't available on MA (React Native) — those live per
 * platform instead (see waveform.utils.ts in musora-platform-frontend for the web one).
 */

import { GET } from '../../infrastructure/http/HttpClient.ts'
import { BASE_PATH } from './audioRecording.js'

/**
 * Downsample peaks array to target count (uses max in each bucket)
 */
export function downsamplePeaks(peaks, targetCount) {
  if (peaks.length <= targetCount) return peaks

  const result = []
  const step = peaks.length / targetCount

  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let max = 0
    for (let j = start; j < end; j++) {
      max = Math.max(max, peaks[j] || 0)
    }
    result.push(Math.round(max * 1000) / 1000)
  }

  return result
}

/**
 * Fetch stored waveform peaks for a recording
 */
export async function getWaveformPeaks(folder) {
  try {
    const data = await GET(`${BASE_PATH}/waveform?folder=${encodeURIComponent(folder)}`)
    return data.peaks && data.peaks.length > 0 ? data.peaks : null
  } catch {
    return null
  }
}

export default {
  downsamplePeaks,
  getWaveformPeaks,
}
