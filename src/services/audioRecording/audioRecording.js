/**
 * Audio Recording Service
 * Shared methods for audio recording functionality across FE and MA
 */

import { GET, POST } from '../../infrastructure/http/HttpClient.ts'
import { globalConfig } from '../config.js'

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

export async function startSession(userId, contentId = null, videoTimeMs = null) {
  return POST(`${BASE_PATH}/start`, {
    user_id: userId,
    content_id: contentId,
    video_time_ms: videoTimeMs,
  })
}

export async function uploadChunk(folder, index, extension, chunk, videoTimeMs = 0, peaks = null) {
  const body = new FormData()
  body.append('folder', folder)
  body.append('index', index)
  body.append('extension', extension)
  body.append('video_time_ms', videoTimeMs)
  body.append('recorded_at', Date.now())

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

export async function stopSession(userId, folder, durationMs, chunkCount, format, reason = null) {
  return POST(`${BASE_PATH}/stop`, {
    user_id: userId,
    folder,
    duration_ms: durationMs,
    chunk_count: chunkCount,
    format,
    reason,
  })
}

/**
 * Log a pause/resume event against a session, for session-boundary reconstitution
 */
export async function logEvent(folder, type, videoTimeMs) {
  return POST(`${BASE_PATH}/event`, { folder, type, video_time_ms: videoTimeMs })
}

/**
 * Tracks the pause/resume/timeout state of an already-started recording session (the
 * caller drives the actual MediaRecorder; this just stays in sync with it), so every
 * platform (web, mobile) applying the "pause >X breaks the session" rule behaves the
 * same way. Owns the grace timer, the pause/resume event logging, and the stop reason
 * ('manual' vs 'timeout').
 */
export function trackAudioRecordingSession(folder, options = {}) {
  const graceMs = options.graceMs ?? 180000
  const onTimeout = options.onTimeout ?? (() => {})
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

  function pause() {
    if (paused) return
    paused = true
    pausedAt = Date.now()

    logEvent(folder, 'pause', elapsedMs()).catch((error) => {
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

    logEvent(folder, 'resume', elapsedMs()).catch((error) => {
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
  logEvent,
  trackAudioRecordingSession,
  listRecordings,
  getCombinedAudioUrl,
}
