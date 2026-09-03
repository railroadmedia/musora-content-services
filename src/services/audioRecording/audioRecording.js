/**
 * Audio Recording Service
 * Shared methods for audio recording functionality across FE and MA
 */

import { GET, POST } from '../../infrastructure/http/HttpClient.ts'
import { globalConfig } from '../config.js'
import { fetchByRailContentIds } from '../sanity.js'
import { decorateAsync } from '../../lib/sanity/decorators/base.ts'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['uploadChunk', 'logEvent']

const MIME_TYPES = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
}

const EXTENSIONS = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
}

const RECORDING_FORMATS = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/aac',
]

// Exported for waveformPeaks.js, which hits the same API prefix.
export const BASE_PATH = '/api/audio-recording/v1'

export function isFormatSupported(mimeType) {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)
}

export function getSupportedFormats() {
  return RECORDING_FORMATS.filter(isFormatSupported)
}

export function getExtensionForMimeType(mimeType) {
  const base = mimeType.split(';')[0].trim()
  return EXTENSIONS[base] || 'bin'
}

export function getMimeTypeForExtension(extension) {
  return MIME_TYPES[extension] || 'application/octet-stream'
}

export function formatDurationMs(ms) {
  if (!ms || !isFinite(ms)) return '0:00'
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  return `${mins}:${s.toString().padStart(2, '0')}`
}

/**
 * Start a recording session. `extras` carries the sync anchors the ML side needs and is
 * written straight into the session's metadata.json by the backend:
 *   - timing:  { play_to_gum_ms, gum_to_recorder_start_ms } — microphone start latency,
 *              measured on the device with performance.now()
 *   - capture: { user_agent, sample_rate, channel_count, echo_cancellation,
 *                noise_suppression, auto_gain_control } — the settings the browser
 *                actually applied to the mic track (MediaStreamTrack.getSettings())
 * `started_at` is the device wall clock in ms so the recording's t=0 can be placed on the
 * same timeline as each chunk's recorded_at.
 */
export async function startSession(userId, contentId = null, videoTimeMs = null, extras = {}) {
  return POST(`${BASE_PATH}/start`, {
    user_id: userId,
    content_id: contentId,
    video_time_ms: videoTimeMs,
    started_at: extras.startedAt ?? Date.now(),
    timing: extras.timing ?? null,
    capture: extras.capture ?? null,
  })
}

/**
 * `videoTimeMs` is the video position when the chunk CLOSED (MediaRecorder hands chunks
 * over on its own timeslice, not on video frames). `timing` lets the caller add:
 *   - videoTimeStartMs: video position when the chunk opened
 *   - chunkDurationMs:  wall-clock length of the chunk excluding any paused time
 *   - firstDataDelayMs: (chunk 1 only) ms from MediaRecorder.start() to first data
 */
export async function uploadChunk(
  folder,
  index,
  extension,
  chunk,
  videoTimeMs = 0,
  peaks = null,
  timing = null
) {
  const body = new FormData()
  body.append('folder', folder)
  body.append('index', index)
  body.append('extension', extension)
  body.append('video_time_ms', videoTimeMs)
  body.append('recorded_at', Date.now())

  if (timing?.videoTimeStartMs != null) body.append('video_time_start_ms', timing.videoTimeStartMs)
  if (timing?.chunkDurationMs != null) body.append('chunk_duration_ms', timing.chunkDurationMs)
  if (timing?.firstDataDelayMs != null) body.append('first_data_delay_ms', timing.firstDataDelayMs)

  // React Native can't reliably build a Blob from an in-memory chunk without a
  // filesystem library, so it passes a base64 string instead; web passes a Blob.
  if (typeof chunk === 'string') {
    body.append('chunk_base64', chunk)
  } else {
    body.append('chunk', chunk, `${String(index).padStart(4, '0')}.${extension}`)
  }

  if (peaks && peaks.length > 0) {
    body.append('peaks', JSON.stringify(peaks))
  }

  return POST(`${BASE_PATH}/chunk`, body)
}

/**
 * `reason` null is a pause checkpoint; a reason marks the session finished. `videoTimeMs`
 * is the video position at stop and is what the 'end' event records as its video time.
 */
export async function stopSession(
  userId,
  folder,
  durationMs,
  chunkCount,
  format,
  reason = null,
  videoTimeMs = null
) {
  return POST(`${BASE_PATH}/stop`, {
    user_id: userId,
    folder,
    duration_ms: durationMs,
    chunk_count: chunkCount,
    format,
    reason,
    stopped_at: Date.now(),
    video_time_ms: videoTimeMs,
  })
}

/**
 * Stop a session from a `pagehide` handler (tab closed, reload, navigation out of the SPA).
 * Ordinary fetches started during unload are cancelled, so this bypasses HttpClient and
 * uses fetch with `keepalive`, which the browser finishes after the page is gone. Same
 * payload as stopSession(); the last partial chunk may not make it, which the backend
 * records under missing_chunks.
 */
export function stopSessionOnPageExit(folder, durationMs, chunkCount, format, videoTimeMs = null) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const token = globalConfig.sessionConfig?.token
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    return fetch(`${globalConfig.baseUrl ?? ''}${BASE_PATH}/stop`, {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        folder,
        duration_ms: durationMs,
        chunk_count: chunkCount,
        format,
        reason: 'page_exit',
        stopped_at: Date.now(),
        video_time_ms: videoTimeMs,
      }),
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Log a pause/resume event against a session, for session-boundary reconstitution.
 * `videoTimeMs` is the VIDEO position at the event; `elapsedMs` is how far into the
 * recording (wall clock since start) it happened. They are different numbers and the ML
 * side needs both to map recording time onto the lesson timeline.
 */
export async function logEvent(folder, type, videoTimeMs, elapsedMs = null, extra = {}) {
  return POST(`${BASE_PATH}/event`, {
    folder,
    type,
    video_time_ms: videoTimeMs,
    elapsed_ms: elapsedMs,
    at: Date.now(),
    ...extra,
  })
}

/**
 * Log a seek made while recording. `fromVideoTimeMs` is where the video was, `toVideoTimeMs`
 * where it landed, `elapsedMs` how far into the recording it happened. The recorder also
 * closes the current chunk at this moment so the chunk anchors stay exact across the jump.
 */
export async function logSeekEvent(folder, fromVideoTimeMs, toVideoTimeMs, elapsedMs = null) {
  return logEvent(folder, 'seek', toVideoTimeMs, elapsedMs, { from_video_time_ms: fromVideoTimeMs })
}

/**
 * Tracks the pause/resume/timeout state of an already-started recording session (the
 * caller drives the actual MediaRecorder; this just stays in sync with it), so every
 * platform (web, mobile) applying the "pause >X breaks the session" rule behaves the
 * same way. Owns the grace timer, the pause/resume event logging, and the stop reason
 * ('manual' vs 'timeout').
 *
 * Pass `getVideoTimeMs` so pause/resume events carry the real video position; without
 * it they fall back to recording-elapsed time, which is NOT a video time.
 */
export function trackAudioRecordingSession(folder, options = {}) {
  const graceMs = options.graceMs ?? 180000
  const onTimeout = options.onTimeout ?? (() => {})
  const getVideoTimeMs =
    typeof options.getVideoTimeMs === 'function' ? options.getVideoTimeMs : null
  const startedAt = Date.now()

  let paused = false
  let pausedAt = null
  let totalPausedMs = 0
  let timer = null
  let stopReason = 'manual'

  function elapsedMs() {
    return Date.now() - startedAt
  }

  // MediaRecorder.pause() genuinely stops capturing audio, so the wall-clock elapsed
  // time overcounts whenever a pause happened — this is what actually ended up recorded.
  function activeElapsedMs() {
    const openPauseMs = paused && pausedAt !== null ? Date.now() - pausedAt : 0
    return elapsedMs() - totalPausedMs - openPauseMs
  }

  function videoTimeOrElapsed() {
    const t = getVideoTimeMs ? getVideoTimeMs() : null
    return Number.isFinite(t) && t >= 0 ? Math.round(t) : elapsedMs()
  }

  function pause() {
    if (paused) return
    paused = true
    pausedAt = Date.now()

    logEvent(folder, 'pause', videoTimeOrElapsed(), elapsedMs()).catch((error) => {
      console.warn('Failed to log pause event:', error)
    })

    timer = setTimeout(() => {
      stopReason = 'timeout'
      timer = null
      onTimeout()
    }, graceMs)
  }

  function resume() {
    if (!paused) return
    paused = false

    if (pausedAt !== null) {
      totalPausedMs += Date.now() - pausedAt
      pausedAt = null
    }

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    logEvent(folder, 'resume', videoTimeOrElapsed(), elapsedMs()).catch((error) => {
      console.warn('Failed to log resume event:', error)
    })
  }

  function finish() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    return stopReason
  }

  return {
    pause,
    resume,
    finish,
    activeElapsedMs,
    isPaused: () => paused,
    elapsedMs,
  }
}

/**
 * List recordings for a user
 */
export async function listRecordings(userId = null, contentId = null, date = null) {
  let url = `${BASE_PATH}/list`
  const params = new URLSearchParams()

  // Omitted (rather than sent as the literal string "null"/"undefined") so the backend
  // falls back to the authenticated user, same as startSession/stopSession do.
  if (userId) params.set('user_id', userId)
  if (contentId) params.set('content_id', contentId)
  if (date) params.set('date', date)

  const query = params.toString()
  if (query) url += `?${query}`

  return GET(url)
}

/**
 * Recordings grouped by lesson, for the "My Recordings" library — one row per lesson the
 * user has recorded on, newest first. The backend only returns raw session aggregates
 * (content_id, recording_count, latest folder/date/duration); the lesson's title/thumbnail
 * are fetched here (batched into one Sanity query) and attached under `content`, so this is
 * shared between FE and MA instead of each re-implementing the Sanity lookup.
 */
export async function getMyRecordings(limit = 20) {
  const { recordings } = await GET(`${BASE_PATH}/my-recordings?limit=${limit}`)

  if (!recordings.length) {
    return []
  }

  const contentIds = recordings.map((recording) => recording.content_id)
  const contentById = new Map(
    (await fetchByRailContentIds(contentIds)).map((content) => [content.id, content])
  )

  return decorateAsync(
    recordings,
    'content',
    async (recording) => contentById.get(recording.content_id) ?? null
  )
}

/**
 * Lesson ids the user has at least one recording for — a lightweight "has recording" check
 * (e.g. for a practice tracker indicator), not the full getMyRecordings() summary.
 *
 * @returns {Promise<Array<number>>}
 */
export async function getRecordedContentIds() {
  const { content_ids } = await GET(`${BASE_PATH}/recorded-content-ids`)
  return content_ids
}

/**
 * Get combined audio URL for a recording. This is consumed directly by an <audio src>
 * or a manual fetch (see fetchAndDecodeAudio in musora-platform-frontend's
 * waveform.utils.ts) rather than through HttpClient — a native media element can't
 * attach an Authorization header, so the /combined route can only be reached this way
 * if it accepts session cookies (HttpClient's credentials: 'include') or the caller
 * re-attaches a token itself.
 */
export function getCombinedAudioUrl(folder) {
  return `${globalConfig.baseUrl ?? ''}${BASE_PATH}/combined?folder=${encodeURIComponent(folder)}`
}

export default {
  MIME_TYPES,
  EXTENSIONS,
  RECORDING_FORMATS,
  isFormatSupported,
  getSupportedFormats,
  getExtensionForMimeType,
  getMimeTypeForExtension,
  formatDurationMs,
  startSession,
  uploadChunk,
  stopSession,
  stopSessionOnPageExit,
  logEvent,
  logSeekEvent,
  trackAudioRecordingSession,
  listRecordings,
  getMyRecordings,
  getRecordedContentIds,
  getCombinedAudioUrl,
}
