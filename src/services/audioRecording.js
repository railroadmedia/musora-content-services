/**
 * Audio Recording Service
 * Shared methods for audio recording functionality across FE and MA
 */

import { GET, POST } from '../infrastructure/http/HttpClient.ts'
import { globalConfig } from './config.js'

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

const DEFAULT_API_PREFIX = '/api/audio-recording/v1'

let apiBase = null

export function configure(options) {
  apiBase = options.apiBase
}

// HttpClient resolves a leading-slash path against globalConfig.baseUrl and attaches
// the auth token itself, so configure() is only needed to override the default prefix.
function endpoint(path) {
  return `${apiBase ?? DEFAULT_API_PREFIX}${path}`
}

// All the JSON endpoints below share the same "throw a plain Error with the server's
// message" contract the raw-fetch version had; HttpClient throws an HttpError instead.
async function unwrapError(promise, fallbackMessage) {
  try {
    return await promise
  } catch (e) {
    throw new Error(e?.body?.message || e?.body?.error || fallbackMessage)
  }
}

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

export async function startSession(userId, contentId = null, videoTimeMs = null) {
  return unwrapError(
    POST(endpoint('/start'), {
      user_id: userId,
      content_id: contentId,
      video_time_ms: videoTimeMs,
    }),
    'Failed to start session'
  )
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

  return unwrapError(POST(endpoint('/chunk'), body), 'Failed to upload chunk')
}

export async function stopSession(userId, folder, durationMs, chunkCount, format, reason = null) {
  return unwrapError(
    POST(endpoint('/stop'), {
      user_id: userId,
      folder,
      duration_ms: durationMs,
      chunk_count: chunkCount,
      format,
      reason,
    }),
    'Failed to stop session'
  )
}

/**
 * Log a pause/resume event against a session, for session-boundary reconstitution
 */
export async function logEvent(folder, type, videoTimeMs) {
  return unwrapError(
    POST(endpoint('/event'), { folder, type, video_time_ms: videoTimeMs }),
    'Failed to log event'
  )
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
 * Incrementally decodes WebM chunks as they're recorded, then at record-stop rewrites
 * chunk 1's header in place with real Duration + Cues, so native players can show
 * duration and seek. Only relevant for WebM (Firefox); MP4/M4A already have both.
 *
 * `ebml` is the ts-ebml module/namespace ({ Decoder, Reader, tools }). Pass it explicitly
 * (e.g. a CDN-loaded global) where no bundler is available; omit it to dynamically
 * import the real 'ts-ebml' package where one is (this only executes the import when
 * no `ebml` is given, so environments that always pass one never need to resolve it).
 */
export async function createWebmSeekabilityFixer(ebml) {
  const lib = ebml ?? (await import('ts-ebml'))
  const decoder = new lib.Decoder()
  const reader = new lib.Reader()

  let queue = Promise.resolve()
  let firstChunkBuffer = null

  function feedChunk(chunkIndex, blob) {
    queue = queue
      .then(() => blob.arrayBuffer())
      .then((buffer) => {
        if (chunkIndex === 1) {
          firstChunkBuffer = buffer
        }
        decoder.decode(buffer).forEach((elm) => reader.read(elm))
      })
  }

  async function finish(folder, extension) {
    if (!firstChunkBuffer) return

    await queue
    reader.stop()

    if (reader.metadataSize > firstChunkBuffer.byteLength) {
      console.warn(
        `WebM header (${reader.metadataSize}B) spans past chunk 1 (${firstChunkBuffer.byteLength}B) — skipping seekability fix.`
      )
      return
    }

    const refined = lib.tools.makeMetadataSeekable(reader.metadatas, reader.duration, reader.cues)
    const tail = firstChunkBuffer.slice(reader.metadataSize)
    const fixedFirstChunk = new Blob([refined, tail], { type: 'audio/webm' })

    await uploadChunk(folder, 1, extension, fixedFirstChunk)
  }

  return { feedChunk, finish }
}

/**
 * List recordings for a user
 */
export async function listRecordings(userId = null, contentId = null, date = null) {
  let url = endpoint('/list')
  const params = new URLSearchParams()

  // Omitted (rather than sent as the literal string "null"/"undefined") so the backend
  // falls back to the authenticated user, same as startSession/stopSession do.
  if (userId) params.set('user_id', userId)
  if (contentId) params.set('content_id', contentId)
  if (date) params.set('date', date)

  const query = params.toString()
  if (query) url += `?${query}`

  return unwrapError(GET(url), 'Failed to load recordings')
}

/**
 * Get combined audio URL for a recording. This is consumed directly by an <audio src>
 * or a manual fetch (see fetchAndDecodeAudio) rather than through HttpClient — a native
 * media element can't attach an Authorization header, so the /combined route can only
 * be reached this way if it accepts session cookies (HttpClient's credentials: 'include')
 * or the caller re-attaches a token itself, same as fetchAndDecodeAudio does below.
 */
export function getCombinedAudioUrl(folder) {
  return `${globalConfig.baseUrl ?? ''}${endpoint('/combined')}?folder=${encodeURIComponent(folder)}`
}

/**
 * Fetch stored waveform peaks for a recording
 */
export async function getWaveformPeaks(folder) {
  try {
    const data = await GET(`${endpoint('/waveform')}?folder=${encodeURIComponent(folder)}`)
    return data.peaks && data.peaks.length > 0 ? data.peaks : null
  } catch {
    return null
  }
}

/**
 * Fetch and decode audio for playback and waveform generation. Goes through the same
 * /combined route as getCombinedAudioUrl, but as a JS-mediated fetch it can (and does)
 * attach the auth token manually, since HttpClient itself only parses JSON/text bodies.
 */
export async function fetchAndDecodeAudio(url, audioContext) {
  const headers = { Accept: '*/*' }
  if (globalConfig.sessionConfig?.token) {
    headers['Authorization'] = `Bearer ${globalConfig.sessionConfig.token}`
  }

  const response = await fetch(url, { headers, credentials: 'include' })

  if (!response.ok) {
    throw new Error('Failed to fetch audio')
  }

  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))

  return {
    arrayBuffer,
    audioBuffer,
    duration: audioBuffer.duration,
    mimeType: response.headers.get('Content-Type') || 'audio/webm',
  }
}

/**
 * Generate waveform peaks from audio buffer
 */
export function generateWaveformPeaks(audioBuffer, samples = 1000) {
  const channelData = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(channelData.length / samples)
  const peaks = []

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i
    let max = 0
    for (let j = 0; j < blockSize; j++) {
      max = Math.max(max, Math.abs(channelData[start + j] || 0))
    }
    peaks.push(max)
  }

  return peaks
}

/**
 * Draw static waveform on canvas
 */
export function drawStaticWaveform(canvas, peaks, options = {}) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const centerY = height / 2
  const barWidth = options.barWidth || 2
  const gap = options.gap || 1
  const barsCount = Math.floor(width / (barWidth + gap))
  const colorStart = options.colorStart || '#4ade80'
  const colorMid = options.colorMid || '#22c55e'
  const colorEnd = options.colorEnd || '#4ade80'
  const bgColor = options.bgColor || '#1d1d1d'

  // Use actual bar count based on available peaks
  const actualBarsCount = Math.min(barsCount, peaks.length)
  const step = peaks.length / actualBarsCount
  const normalizedPeaks = []

  for (let i = 0; i < actualBarsCount; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let max = 0
    for (let j = start; j < end; j++) {
      if (j < peaks.length) {
        max = Math.max(max, Math.abs(peaks[j]))
      }
    }
    normalizedPeaks.push(max)
  }

  // Normalize to full height
  const peakMax = Math.max(...normalizedPeaks, 0.1)
  const scaledPeaks = normalizedPeaks.map((p) => p / peakMax)

  // Clear canvas
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // Calculate bar spacing to fill entire width
  const totalBarSpace = width / actualBarsCount
  const actualBarWidth = Math.max(1, totalBarSpace - gap)

  // Draw bars
  scaledPeaks.forEach((amp, i) => {
    const barHeight = Math.max(2, amp * height * 0.85)
    const x = i * totalBarSpace

    const gradient = ctx.createLinearGradient(
      0,
      centerY - barHeight / 2,
      0,
      centerY + barHeight / 2
    )
    gradient.addColorStop(0, colorStart)
    gradient.addColorStop(0.5, colorMid)
    gradient.addColorStop(1, colorEnd)

    ctx.fillStyle = gradient
    ctx.fillRect(x, centerY - barHeight / 2, actualBarWidth, barHeight)
  })

  return scaledPeaks
}

// RMS + peak blend for one analyser frame — shared by the data-only capture and the
// visual waveform, so both agree on what "amplitude" means.
function computeAmplitude(analyser) {
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)

  let sumSquares = 0
  let peak = 0
  for (let i = 0; i < bufferLength; i++) {
    const v = (dataArray[i] - 128) / 128
    sumSquares += v * v
    peak = Math.max(peak, Math.abs(v))
  }
  const rms = Math.sqrt(sumSquares / bufferLength)
  return Math.min(1, Math.max(0.02, rms * 2, peak * 0.7))
}

/**
 * Captures live microphone amplitude for chunk peaks, without rendering anything —
 * the data half of createLiveWaveform, for recorder UIs that don't show a waveform.
 */
export function createPeakCapture(mediaStream, options = {}) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = options.fftSize || 2048
  analyser.smoothingTimeConstant = 0.3

  const source = audioContext.createMediaStreamSource(mediaStream)
  source.connect(analyser)

  let animationId = null
  let chunkPeaks = []
  let paused = false

  function sample() {
    if (!paused) {
      chunkPeaks.push(computeAmplitude(analyser))
    }
    animationId = requestAnimationFrame(sample)
  }

  sample()

  return {
    analyser,
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      audioContext.close()
    },
    flushChunkPeaks() {
      const peaks = [...chunkPeaks]
      chunkPeaks = []
      return peaks
    },
    pause() {
      paused = true
    },
    resume() {
      paused = false
    },
  }
}

/**
 * Create live waveform visualizer with peak capture for storage. Thin rendering
 * layer over createPeakCapture — use that directly if you don't need the canvas.
 */
export function createLiveWaveform(canvas, mediaStream, options = {}) {
  const capture = createPeakCapture(mediaStream, options)
  const ctx = canvas.getContext('2d')

  let animationId = null
  let history = []
  let paused = false

  const barWidth = options.barWidth || 2
  const gap = options.gap || 1
  const colorStart = options.colorStart || '#4ade80'
  const colorMid = options.colorMid || '#22c55e'
  const colorEnd = options.colorEnd || '#4ade80'
  const bgColor = options.bgColor || '#1d1d1d'

  function initCanvas() {
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  function draw() {
    // Frozen on the last drawn frame while paused — the mic stream itself keeps
    // running, so without this the waveform would keep reacting to sound the
    // recorder isn't actually capturing.
    if (paused) {
      animationId = requestAnimationFrame(draw)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const amplitude = computeAmplitude(capture.analyser)

    history.push(amplitude)
    const maxBars = Math.floor(width / (barWidth + gap))
    if (history.length > maxBars) {
      history.shift()
    }

    // Clear and draw
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    const centerY = height / 2
    history.forEach((amp, i) => {
      const barHeight = Math.max(2, amp * height * 0.9)
      const x = i * (barWidth + gap)

      const gradient = ctx.createLinearGradient(
        0,
        centerY - barHeight / 2,
        0,
        centerY + barHeight / 2
      )
      gradient.addColorStop(0, colorStart)
      gradient.addColorStop(0.5, colorMid)
      gradient.addColorStop(1, colorEnd)

      ctx.fillStyle = gradient
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
    })

    animationId = requestAnimationFrame(draw)
  }

  initCanvas()
  draw()

  return {
    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      capture.stop()
    },
    resize: initCanvas,
    flushChunkPeaks: capture.flushChunkPeaks,
    pause() {
      paused = true
      capture.pause()
    },
    resume() {
      paused = false
      capture.resume()
    },
  }
}

export default {
  configure,
  MIME_TYPES,
  EXTENSIONS,
  RECORDING_FORMATS,
  isFormatSupported,
  getSupportedFormats,
  getExtensionForMimeType,
  getMimeTypeForExtension,
  formatDurationMs,
  downsamplePeaks,
  startSession,
  uploadChunk,
  stopSession,
  logEvent,
  trackAudioRecordingSession,
  createWebmSeekabilityFixer,
  listRecordings,
  getCombinedAudioUrl,
  getWaveformPeaks,
  fetchAndDecodeAudio,
  generateWaveformPeaks,
  drawStaticWaveform,
  createLiveWaveform,
  createPeakCapture,
}
