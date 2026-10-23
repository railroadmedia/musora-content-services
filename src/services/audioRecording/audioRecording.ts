/**
 * Audio Recording Service
 * Shared methods for audio recording functionality across FE and MA
 */

import { GET, POST } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { fetchByRailContentIds } from '../sanity.js'
import { decorateAsync } from '../../lib/sanity/decorators/base'
import { mapLearningPathParentsTo } from '../my-path/learning-paths'
import { ClockOffset, estimateClockOffset, monotonicNow } from './recordingClock'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['uploadChunk', 'logEvent']

export type RecordingPlaybackStatus = 'pending' | 'ready' | 'failed' | null

/**
 * One take, as listed per lesson (listRecordings) and returned by renameRecording.
 * `take_number` is only null for a take recorded outside a lesson.
 */
export interface RecordingTake {
  folder: string
  content_id: number | null
  created_at: string
  duration_ms: number
  chunk_count: number
  missing_chunks: number[]
  format: string | null
  take_number: number | null
  name: string | null
  is_shared: boolean
  playback_status: RecordingPlaybackStatus
}

/** A take on a lesson, as every per-lesson list returns it: always numbered. */
export type LessonRecordingTake = RecordingTake & { content_id: number; take_number: number }

export type MyRecordingSummary = {
  content_id: number
  recording_count: number
  latest_folder: string
  latest_created_at: string
  latest_duration_ms: number
}

export type RecordingLesson = {
  id: number
  title?: string
  thumbnail?: string
  type?: string
  parent_id?: number
  brand?: string
  [key: string]: unknown
}

export type MyRecording = MyRecordingSummary & {
  content: RecordingLesson | null
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface MyRecordingsPage {
  recordings: MyRecording[]
  meta: PaginationMeta
}

export interface RecordingIndicators {
  content_ids: number[]
  processing_content_ids: number[]
}

export interface StartSessionExtras {
  date?: string
  startedAt?: number
  timing?: Record<string, number | null> | null
  capture?: Record<string, unknown> | null
  device?: Record<string, unknown> | null
}

export interface StartSessionResponse {
  folder: string
  chunk_seconds: number
  server_received_at: number
  server_now: number
  clock: ClockOffset | null
}

/** Web uploads a Blob; React Native a base64 string. */
export type AudioChunk = Blob | string

export interface ChunkTiming {
  videoTimeStartMs?: number | null
  chunkDurationMs?: number | null
  firstDataDelayMs?: number | null
  levelDb?: number | null
  playbackRate?: number | null
}

export interface UploadChunkResponse {
  path: string
  bytes: number
}

export interface StopSessionResponse {
  success: true
  deleted: boolean
  missing_chunks: number[]
}

export type RecordingStopReason = 'manual' | 'timeout' | 'max_duration'

export type RecordingEventPosition = {
  audio_ms?: number
  chunk_index?: number
  at?: number
}

export type RecordingEventExtra = RecordingEventPosition & Record<string, unknown>

export interface RecordingEvent {
  type: string
  video_time_ms: number | null
  elapsed_ms?: number | null
  at: number
  received_at?: number
  reason?: string
  from_video_time_ms?: number
  audio_ms?: number
  chunk_index?: number
  from_rate?: number
  to_rate?: number
}

export interface TrackAudioRecordingSessionOptions {
  graceMs?: number
  onTimeout?: () => void
  maxActiveMs?: number
  onMaxDuration?: () => void
  getVideoTimeMs?: () => number | null
  getAudioMs?: () => number | null
  getChunkIndex?: () => number | null
}

export interface RecordingEventOverrides {
  audioMs?: number
  videoTimeMs?: number
  chunkIndex?: number
  at?: number
  log?: boolean
}

export interface AudioRecordingSessionTracker {
  pause: (overrides?: RecordingEventOverrides) => void
  resume: (overrides?: RecordingEventOverrides) => void
  finish: () => RecordingStopReason
  activeElapsedMs: () => number
  isPaused: () => boolean
  elapsedMs: () => number
}

export interface TimelineChunk {
  index: number
  video_time_start_ms: number | null
  video_time_ms: number | null
  chunk_duration_ms: number | null
  audio_start_ms: number | null
  audio_end_ms: number | null
  playback_rate: number
  first_data_delay_ms: number | null
}

export interface RecordingTimeline {
  video_time_ms_at_start: number | null
  duration_ms: number
  playback_rate_at_start: number | null
  latency_ms: number | null
  prior_latency_ms: number | null
  chunks: TimelineChunk[]
  events: RecordingEvent[]
}

export interface ShareRecordingResponse {
  share_token: string
}

export interface DeleteLessonRecordingsResponse {
  folders: string[]
}

export interface SharedRecording {
  shared_by: string | null
  content_id: number | null
  take_number: number | null
  name: string | null
  created_at: string
  duration_ms: number
  playback: { url: string; expires_at: string; mime_type: string; peaks: number[] }
}

export interface ChunkFormatFixer {
  feedChunk: (index: number, chunk: AudioChunk) => void
  finish: () => Promise<Blob | null | undefined | false>
}

export interface AudioChunkUploader {
  upload: (
    index: number,
    chunk: AudioChunk,
    videoTimeMs?: number,
    peaks?: number[] | null,
    timing?: ChunkTiming | null
  ) => Promise<UploadChunkResponse>
  finish: () => Promise<void>
}

const MIME_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
}

const EXTENSIONS: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
}

// WebM first: Chrome's MP4 recorder emits a header-only first chunk and holds audio back
// until the next fragment boundary (requestData() on pause returns a few bytes), so a take
// is undecodable for its first ~10 s and its tail only reaches the server at stop.
const RECORDING_FORMATS = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/aac',
]

// Exported for waveformPeaks.ts, which hits the same API prefix.
export const BASE_PATH = '/api/audio-recording/v1'

export function isFormatSupported(mimeType: string): boolean {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)
}

export function getSupportedFormats(): string[] {
  return RECORDING_FORMATS.filter(isFormatSupported)
}

export function getExtensionForMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0].trim()
  return EXTENSIONS[base] || 'bin'
}

export function getMimeTypeForExtension(extension: string): string {
  return MIME_TYPES[extension] || 'application/octet-stream'
}

export function formatDurationMs(ms: number | null | undefined): string {
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
 *   - device:  browser, OS, hardware, screen and audio device report; stored on the
 *              session row as JSON
 * `started_at` is the device wall clock in ms so the recording's t=0 can be placed on the
 * same timeline as each chunk's recorded_at. `date` defaults to the device's own local
 * calendar day (not UTC) — pass `extras.date` to override, otherwise a recording made
 * right around midnight always lands on the day the user actually experienced.
 */
export async function startSession(
  userId: number | null,
  contentId: number | null = null,
  videoTimeMs: number | null = null,
  extras: StartSessionExtras = {}
): Promise<StartSessionResponse> {
  const sentAt = Date.now()
  const sentPerf = monotonicNow()
  const response: Omit<StartSessionResponse, 'clock'> = await POST(`${BASE_PATH}/start`, {
    user_id: userId,
    content_id: contentId,
    video_time_ms: videoTimeMs,
    date: extras.date ?? new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD wall clock date in user's timezone
    started_at: extras.startedAt ?? Date.now(),
    timing: extras.timing ?? null,
    capture: extras.capture ?? null,
    device: extras.device ?? null,
  })
  return {
    ...response,
    clock: estimateClockOffset(
      response?.server_now,
      sentAt,
      sentPerf,
      response?.server_received_at
    ),
  }
}

/**
 * `videoTimeMs` is the video position when the chunk CLOSED (MediaRecorder hands chunks
 * over on its own timeslice, not on video frames). `timing` lets the caller add:
 *   - videoTimeStartMs: video position when the chunk opened
 *   - chunkDurationMs:  wall-clock length of the chunk excluding any paused time
 *   - firstDataDelayMs: (chunk 1 only) ms from MediaRecorder.start() to first data
 *   - levelDb:          loudest RMS level in the chunk, dBFS
 *   - playbackRate:     lesson playback speed while the chunk recorded (the recorder closes
 *                       a chunk on every speed change, so one chunk has one speed)
 */
export async function uploadChunk(
  folder: string,
  index: number,
  extension: string,
  chunk: AudioChunk,
  videoTimeMs: number = 0,
  peaks: number[] | null = null,
  timing: ChunkTiming | null = null
): Promise<UploadChunkResponse> {
  const body = new FormData()
  body.append('folder', folder)
  body.append('index', String(index))
  body.append('extension', extension)
  body.append('video_time_ms', String(videoTimeMs))
  body.append('recorded_at', String(Date.now()))

  if (timing?.videoTimeStartMs != null) body.append('video_time_start_ms', String(timing.videoTimeStartMs))
  if (timing?.chunkDurationMs != null) body.append('chunk_duration_ms', String(timing.chunkDurationMs))
  if (timing?.firstDataDelayMs != null) body.append('first_data_delay_ms', String(timing.firstDataDelayMs))
  if (timing?.levelDb != null) body.append('level_db', String(timing.levelDb))
  if (timing?.playbackRate != null) body.append('playback_rate', String(timing.playbackRate))

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
 * `clock` is the `{ offset_ms, rtt_ms }` that startSession() measured, stored in metadata.
 */
export async function stopSession(
  userId: number | null,
  folder: string,
  durationMs: number,
  chunkCount: number,
  format: string,
  reason: string | null = null,
  videoTimeMs: number | null = null,
  clock: ClockOffset | null = null
): Promise<StopSessionResponse> {
  return POST(`${BASE_PATH}/stop`, {
    user_id: userId,
    folder,
    duration_ms: durationMs,
    chunk_count: chunkCount,
    format,
    reason,
    stopped_at: Date.now(),
    video_time_ms: videoTimeMs,
    ...clockFields(clock),
  })
}

function clockFields(
  clock: ClockOffset | null
): { clock_offset_ms?: number; clock_rtt_ms?: number | null } {
  if (!clock || !Number.isFinite(clock.offset_ms)) return {}
  return { clock_offset_ms: clock.offset_ms, clock_rtt_ms: clock.rtt_ms ?? null }
}

/**
 * Stop a session from a `pagehide` handler (tab closed, reload, navigation out of the SPA).
 * Ordinary fetches started during unload are cancelled, so this bypasses HttpClient and
 * uses fetch with `keepalive`, which the browser finishes after the page is gone. Same
 * payload as stopSession(); the last partial chunk may not make it, which the backend
 * records under missing_chunks.
 */
export function stopSessionOnPageExit(
  folder: string,
  durationMs: number,
  chunkCount: number,
  format: string,
  videoTimeMs: number | null = null,
  clock: ClockOffset | null = null
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
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
        ...clockFields(clock),
      }),
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Log an event against a session. Positions, all optional except `videoTimeMs`:
 *   - videoTimeMs:   lesson VIDEO position at the event
 *   - elapsedMs:     wall-clock ms since the session tracker started (kept for older readers;
 *                    it starts ~5 s after audio t=0 and counts paused time, so it is NOT a
 *                    position in the recording)
 *   - extra.audio_ms:    position in the recording at the event (active time, pauses
 *                        excluded); the clock to use for placing an event on the audio
 *   - extra.chunk_index: the chunk the event closed (pause, seek and speed change flush one)
 */
export async function logEvent(
  folder: string,
  type: string,
  videoTimeMs: number,
  elapsedMs: number | null = null,
  extra: RecordingEventExtra = {}
): Promise<unknown> {
  return POST(`${BASE_PATH}/event`, {
    folder,
    type,
    video_time_ms: videoTimeMs,
    elapsed_ms: elapsedMs,
    at: extra.at ?? Date.now(),
    ...extra,
  })
}

/**
 * Log a seek made while recording. `fromVideoTimeMs` is where the video was, `toVideoTimeMs`
 * where it landed. `position` carries `audio_ms` and `chunk_index` (see logEvent). The
 * recorder also closes the current chunk at this moment so the chunk anchors stay exact
 * across the jump.
 */
export async function logSeekEvent(
  folder: string,
  fromVideoTimeMs: number,
  toVideoTimeMs: number,
  elapsedMs: number | null = null,
  position: RecordingEventPosition = {}
): Promise<unknown> {
  return logEvent(folder, 'seek', toVideoTimeMs, elapsedMs, {
    from_video_time_ms: fromVideoTimeMs,
    ...position,
  })
}

/**
 * Tracks the pause/resume/timeout state of an already-started recording session (the
 * caller drives the actual MediaRecorder; this just stays in sync with it), so every
 * platform (web, mobile) applying the "pause >X breaks the session" rule behaves the
 * same way. Owns the grace timer, the max-duration timer, the pause/resume event logging,
 * and the stop reason ('manual', 'timeout' or 'max_duration').
 *
 * `maxActiveMs` caps the recorded (unpaused) time of one session; once reached,
 * `onMaxDuration` is called so the caller can stop the recorder.
 *
 * Pass `getVideoTimeMs` so pause/resume events carry the real video position; without
 * it they fall back to recording-elapsed time, which is NOT a video time.
 *
 * Pass `getAudioMs` so pause/resume events carry `audio_ms`, the position in the recording.
 * The tracker starts when the session exists, which on web is after the first few seconds
 * of audio, so its own active time is only a fallback. `getChunkIndex` adds the index of
 * the last chunk delivered, which for a pause is the chunk its flush closed.
 *
 * pause() and resume() accept overrides (`audioMs`, `videoTimeMs`, `chunkIndex`, `at`) for
 * an event that happened before the session existed, and `log: false` to only sync state.
 */
export function trackAudioRecordingSession(
  folder: string,
  options: TrackAudioRecordingSessionOptions = {}
): AudioRecordingSessionTracker {
  const graceMs = options.graceMs ?? 180000
  const onTimeout = options.onTimeout ?? (() => {})
  const maxActiveMs = options.maxActiveMs ?? 900000
  const onMaxDuration = options.onMaxDuration ?? (() => {})
  const getVideoTimeMs =
    typeof options.getVideoTimeMs === 'function' ? options.getVideoTimeMs : null
  const getAudioMs = typeof options.getAudioMs === 'function' ? options.getAudioMs : null
  const getChunkIndex = typeof options.getChunkIndex === 'function' ? options.getChunkIndex : null
  const startedAt = monotonicNow()

  let paused = false
  let pausedAt: number | null = null
  let totalPausedMs = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
  let stopReason: RecordingStopReason = 'manual'

  function elapsedMs(): number {
    return Math.round(monotonicNow() - startedAt)
  }

  // MediaRecorder.pause() genuinely stops capturing audio, so the wall-clock elapsed
  // time overcounts whenever a pause happened — this is what actually ended up recorded.
  function activeElapsedMs(): number {
    const openPauseMs = paused && pausedAt !== null ? monotonicNow() - pausedAt : 0
    return Math.round(monotonicNow() - startedAt - totalPausedMs - openPauseMs)
  }

  function videoTimeOrElapsed(): number {
    const t = getVideoTimeMs ? getVideoTimeMs() : null
    return typeof t === 'number' && Number.isFinite(t) && t >= 0 ? Math.round(t) : elapsedMs()
  }

  function audioMs(overrides: RecordingEventOverrides): number | null {
    const t = overrides.audioMs ?? (getAudioMs ? getAudioMs() : null)
    return typeof t === 'number' && Number.isFinite(t) ? Math.max(0, Math.round(t)) : null
  }

  function position(overrides: RecordingEventOverrides): RecordingEventPosition {
    const chunkIndex = overrides.chunkIndex ?? (getChunkIndex ? getChunkIndex() : null)
    const extra: RecordingEventPosition = {}
    const measuredAudioMs = audioMs(overrides)
    if (measuredAudioMs !== null) extra.audio_ms = measuredAudioMs
    if (typeof chunkIndex === 'number' && Number.isFinite(chunkIndex) && chunkIndex > 0) {
      extra.chunk_index = chunkIndex
    }
    if (Number.isFinite(overrides.at)) extra.at = overrides.at
    return extra
  }

  function log(type: string, overrides: RecordingEventOverrides): void {
    if (overrides.log === false) return
    logEvent(
      folder,
      type,
      overrides.videoTimeMs ?? videoTimeOrElapsed(),
      elapsedMs(),
      position(overrides)
    ).catch((error) => {
      console.warn(`Failed to log ${type} event:`, error)
    })
  }

  function startMaxDurationTimer(): void {
    if (stopReason === 'max_duration') return

    maxDurationTimer = setTimeout(() => {
      stopReason = 'max_duration'
      maxDurationTimer = null
      onMaxDuration()
    }, Math.max(0, maxActiveMs - activeElapsedMs()))
  }

  function clearMaxDurationTimer(): void {
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer)
      maxDurationTimer = null
    }
  }

  function pause(overrides: RecordingEventOverrides = {}): void {
    if (paused) return
    paused = true
    pausedAt = monotonicNow()
    clearMaxDurationTimer()

    log('pause', overrides)

    timer = setTimeout(() => {
      stopReason = 'timeout'
      timer = null
      onTimeout()
    }, graceMs)
  }

  function resume(overrides: RecordingEventOverrides = {}): void {
    if (!paused) return
    paused = false

    if (pausedAt !== null) {
      totalPausedMs += monotonicNow() - pausedAt
      pausedAt = null
    }

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    startMaxDurationTimer()

    log('resume', overrides)
  }

  function finish(): RecordingStopReason {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    clearMaxDurationTimer()

    return stopReason
  }

  startMaxDurationTimer()

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
 * List a user's recordings for one lesson, optionally narrowed to one day. contentId is
 * required — the backend rejects a request without it (422); pass a date to narrow further,
 * or omit it for every recording on that lesson regardless of date.
 */
export async function listRecordings(
  userId: number | null = null,
  contentId: number,
  date: string | null = null
): Promise<LessonRecordingTake[]> {
  if (!contentId) {
    throw new Error('listRecordings requires a contentId.')
  }

  let url = `${BASE_PATH}/my-sessions`
  const params = new URLSearchParams()

  // Omitted (rather than sent as the literal string "null"/"undefined") so the backend
  // falls back to the authenticated user, same as startSession/stopSession do.
  if (userId) params.set('user_id', String(userId))
  params.set('content_id', String(contentId))
  if (date) params.set('date', date)

  const query = params.toString()
  if (query) url += `?${query}`

  return GET(url)
}

/**
 * Paginated recordings grouped by lesson, for the "My Recordings" library — one row per lesson the
 * user has recorded on, newest first. The backend only returns raw session aggregates
 * (content_id, recording_count, latest folder/date/duration); the lesson's title/thumbnail
 * are fetched here (batched into one Sanity query) and attached under `content`, so this is
 * shared between FE and MA instead of each re-implementing the Sanity lookup.
 */
export async function getMyRecordings({
  page = 1,
  limit = 20,
}: { page?: number; limit?: number } = {}): Promise<MyRecordingsPage> {
  const { data: recordings, meta }: { data: MyRecordingSummary[]; meta: PaginationMeta } = await GET(
    `${BASE_PATH}/my-recordings?page=${page}&limit=${limit}`
  )

  if (!recordings.length) {
    return { recordings: [], meta }
  }

  const contentIds = recordings.map((recording) => recording.content_id)
  const methodLessons = (await mapLearningPathParentsTo(await fetchByRailContentIds(contentIds), {
    type: true,
    parent_id: true,
  })) as RecordingLesson[]
  const contentById = new Map(methodLessons.map((content) => [content.id, content]))

  const decoratedRecordings = await decorateAsync(
    recordings,
    'content',
    async (recording) => contentById.get(recording.content_id) ?? null
  )

  return { recordings: decoratedRecordings, meta }
}

/**
 * Lesson ids the user has at least one recording for — a lightweight "has recording" check
 * (e.g. for a daily or weekly practice tracker indicator), not the full getMyRecordings()
 * summary. Pass only `startDate` (YYYY-MM-DD) to scope it to that single calendar day
 * (daily tracker), or both `startDate` and `endDate` for an inclusive range (weekly
 * tracker); omit both for all-time.
 */
export async function getRecordedContentIds(
  startDate: string | null = null,
  endDate: string | null = null
): Promise<number[]> {
  const { content_ids } = await getRecordingIndicators(startDate, endDate)
  return content_ids
}

export async function getRecordingIndicators(
  startDate: string | null = null,
  endDate: string | null = null
): Promise<RecordingIndicators> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const query = params.toString()
  return GET(`${BASE_PATH}/recorded-content-ids${query ? `?${query}` : ''}`)
}

export async function getRecordingTimeline(folder: string): Promise<RecordingTimeline> {
  return GET(`${BASE_PATH}/timeline?folder=${encodeURIComponent(folder)}`)
}

/**
 * Get combined audio URL for a recording. This is consumed directly by an <audio src>
 * or a manual fetch (see fetchAndDecodeAudio in musora-platform-frontend's
 * waveform.utils.ts) rather than through HttpClient — a native media element can't
 * attach an Authorization header, so the /combined route can only be reached this way
 * if it accepts session cookies (HttpClient's credentials: 'include') or the caller
 * re-attaches a token itself.
 *
 * Users get 409 here until the playback copy is ready; only staff get the raw chunks.
 */
export function getCombinedAudioUrl(folder: string): string {
  return `${globalConfig.baseUrl ?? ''}${BASE_PATH}/combined?folder=${encodeURIComponent(folder)}`
}

/**
 * Download URL for a recording — same audio bytes as getCombinedAudioUrl, but the backend
 * sends it as an attachment (Content-Disposition), so the browser saves it instead of
 * playing it inline. Meant for a plain `<a :href>`/navigation, not a fetch.
 */
export function getDownloadUrl(folder: string): string {
  return `${globalConfig.baseUrl ?? ''}${BASE_PATH}/download?folder=${encodeURIComponent(folder)}`
}

/**
 * Create (or return the existing) share link for a recording. Owner only; idempotent —
 * re-sharing an already-shared recording returns the same token, not a new one. The link
 * never expires on its own, only via unshareRecording().
 */
export async function shareRecording(folder: string): Promise<ShareRecordingResponse> {
  return POST(`${BASE_PATH}/share`, { folder })
}

/**
 * Revoke a recording's share link, if one exists. Owner only.
 */
export async function unshareRecording(folder: string): Promise<unknown> {
  return POST(`${BASE_PATH}/unshare`, { folder })
}

/**
 * Give a take a custom name. Owner only. Pass null or an empty string to clear it, so the
 * take shows as "Take {take_number}" again. Returns the updated recording.
 */
export async function renameRecording(folder: string, name: string | null): Promise<RecordingTake> {
  return POST(`${BASE_PATH}/rename`, { folder, name })
}

/**
 * Delete one take. Owner only. The take disappears from every recordings list right away and
 * can be brought back with restoreRecordings([folder]) during the undo window (10 minutes);
 * after that its audio is removed for good. Take numbers of the other takes never change.
 */
export async function deleteRecording(folder: string): Promise<unknown> {
  return POST(`${BASE_PATH}/delete`, { folder })
}

/**
 * Delete every take the user has on a lesson. Resolves to { folders } — pass that list to
 * restoreRecordings() to undo the whole delete.
 */
export async function deleteLessonRecordings(
  contentId: number
): Promise<DeleteLessonRecordingsResponse> {
  return POST(`${BASE_PATH}/delete-lesson-recordings`, {
    content_id: contentId,
  })
}

/**
 * Undo for deleteRecording / deleteLessonRecordings, within the undo window. Rejects with a 404
 * when nothing could be restored (the window has passed or the takes aren't the user's).
 */
export async function restoreRecordings(folders: string[]): Promise<unknown> {
  return POST(`${BASE_PATH}/restore`, { folders })
}

/**
 * Fetch metadata for a shared recording.
 * Returns the recording details (shared_by, content_id, take_number, name, duration_ms,
 * created_at) plus a short-lived playback URL. Returns null for invalid/expired/unshared
 * tokens (the backend returns 404 with a generic "unavailable" message for all of these).
 *
 * @param token - 48-char alphanumeric share token
 */
export async function getSharedRecording(token: string): Promise<SharedRecording | null> {
  try {
    return await GET(`${BASE_PATH}/shared/${encodeURIComponent(token)}`)
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Build the user-facing share URL for a recording. This is the link the owner copies and
 * sends to others — when opened, it should route to the lesson playback page and trigger
 * the shared recording modal/drawer. The caller supplies the brand's base URL (e.g.
 * "https://www.drumeo.com") since MCS doesn't know which brand context it's running in.
 *
 * @param brandBaseUrl - Brand's web base URL (e.g. "https://www.drumeo.com")
 * @param token - 48-char alphanumeric share token from shareRecording()
 */
export function buildShareUrl(brandBaseUrl: string, token: string): string {
  return `${brandBaseUrl}/shared-recording/${encodeURIComponent(token)}`
}

/**
 * Playback URL for a shared recording — any signed-in user holding the token can reach it,
 * not just the owner. Same <audio src> vs. manual-fetch caveat as getCombinedAudioUrl.
 */
export function getSharedCombinedAudioUrl(token: string): string {
  return `${globalConfig.baseUrl ?? ''}${BASE_PATH}/shared/${encodeURIComponent(token)}/combined`
}

/**
 * Wraps uploadChunk with an optional per-recording enhancement hook, so callers never
 * need to call uploadChunk directly. `createFormatFixer`, if given, is called with no
 * arguments to build a fixer exposing `feedChunk(index, blob)` and an async `finish()`
 * that returns the corrected chunk-1 Blob (or a falsy value to skip) — this function owns
 * re-uploading it. A failure anywhere in the fixer is caught and logged rather than
 * blocking the actual upload, which must never depend on it. Deciding *whether* a fixer
 * is needed (e.g. only for `extension === 'webm'`) is the caller's job, not this
 * function's — pass `null`/omit for any recording that doesn't need one.
 *
 * Only FE currently passes one (the WebM/ts-ebml seekability fixer, which lives there
 * since MA never produces WebM in the first place); omit it on any platform that has
 * nothing to fix.
 */
export async function createAudioChunkUploader(
  folder: string,
  extension: string,
  createFormatFixer: (() => ChunkFormatFixer | Promise<ChunkFormatFixer>) | null = null
): Promise<AudioChunkUploader> {
  let fixer: ChunkFormatFixer | null = null
  if (createFormatFixer) {
    try {
      fixer = await createFormatFixer()
    } catch (error) {
      console.warn('Chunk format fixer failed to initialize; uploading chunks unfixed:', error)
    }
  }

  // the fixed chunk 1 replaces the original's sync sidecar too, so it must carry the same anchors
  let firstChunkSync: {
    videoTimeMs?: number
    peaks?: number[] | null
    timing?: ChunkTiming | null
  } | null = null

  function upload(
    index: number,
    chunk: AudioChunk,
    videoTimeMs?: number,
    peaks?: number[] | null,
    timing: ChunkTiming | null = null
  ): Promise<UploadChunkResponse> {
    fixer?.feedChunk(index, chunk)
    if (index === 1) firstChunkSync = { videoTimeMs, peaks, timing }
    return uploadChunk(folder, index, extension, chunk, videoTimeMs, peaks, timing)
  }

  async function finish(): Promise<void> {
    if (!fixer) return

    try {
      const fixedFirstChunk = await fixer.finish()
      if (fixedFirstChunk) {
        await uploadChunk(
          folder,
          1,
          extension,
          fixedFirstChunk,
          firstChunkSync?.videoTimeMs,
          firstChunkSync?.peaks,
          firstChunkSync?.timing
        )
      }
    } catch (error) {
      console.warn('Chunk format fixer failed to finalize; recording stays as uploaded:', error)
    }
  }

  return { upload, finish }
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
  getDownloadUrl,
  shareRecording,
  unshareRecording,
  renameRecording,
  deleteRecording,
  deleteLessonRecordings,
  restoreRecordings,
  getSharedRecording,
  buildShareUrl,
  getSharedCombinedAudioUrl,
  createAudioChunkUploader,
}
