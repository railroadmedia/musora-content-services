jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: jest.fn().mockResolvedValue({}),
}))

import { trackAudioRecordingSession } from '../../src/services/audioRecording/audioRecording'

const FOLDER = 'user-audio/1_2026-10-05_120000/'
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

describe('trackAudioRecordingSession max duration', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  test('stops with max_duration after 15 minutes of recorded time by default', () => {
    const onMaxDuration = jest.fn()
    const tracker = trackAudioRecordingSession(FOLDER, { onMaxDuration })

    jest.advanceTimersByTime(FIFTEEN_MINUTES_MS - 1)
    expect(onMaxDuration).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(onMaxDuration).toHaveBeenCalledTimes(1)
    expect(tracker.finish()).toBe('max_duration')
  })

  test('does not count paused time toward the limit', () => {
    const onMaxDuration = jest.fn()
    const tracker = trackAudioRecordingSession(FOLDER, { maxActiveMs: 10_000, onMaxDuration })

    jest.advanceTimersByTime(6_000)
    tracker.pause()
    jest.advanceTimersByTime(60_000)
    tracker.resume()

    jest.advanceTimersByTime(3_999)
    expect(onMaxDuration).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(onMaxDuration).toHaveBeenCalledTimes(1)
  })

  test('keeps the pause timeout reason when the session times out before the limit', () => {
    const onMaxDuration = jest.fn()
    const onTimeout = jest.fn()
    const tracker = trackAudioRecordingSession(FOLDER, {
      graceMs: 180_000,
      maxActiveMs: FIFTEEN_MINUTES_MS,
      onTimeout,
      onMaxDuration,
    })

    jest.advanceTimersByTime(60_000)
    tracker.pause()
    jest.advanceTimersByTime(FIFTEEN_MINUTES_MS)

    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(onMaxDuration).not.toHaveBeenCalled()
    expect(tracker.finish()).toBe('timeout')
  })

  test('does not fire again after resuming once the limit was reached', () => {
    const onMaxDuration = jest.fn()
    const tracker = trackAudioRecordingSession(FOLDER, { maxActiveMs: 10_000, onMaxDuration })

    jest.advanceTimersByTime(10_000)
    tracker.pause()
    tracker.resume()
    jest.advanceTimersByTime(10_000)

    expect(onMaxDuration).toHaveBeenCalledTimes(1)
  })

  test('finish cancels the pending max duration stop', () => {
    const onMaxDuration = jest.fn()
    const tracker = trackAudioRecordingSession(FOLDER, { maxActiveMs: 10_000, onMaxDuration })

    jest.advanceTimersByTime(5_000)
    expect(tracker.finish()).toBe('manual')

    jest.advanceTimersByTime(10_000)
    expect(onMaxDuration).not.toHaveBeenCalled()
  })
})

describe('trackAudioRecordingSession event positions', () => {
  const { POST } = jest.requireMock('../../src/infrastructure/http/HttpClient.ts')

  beforeEach(() => {
    jest.useFakeTimers()
    POST.mockClear()
  })
  afterEach(() => jest.useRealTimers())

  const lastEventBody = () => POST.mock.calls[POST.mock.calls.length - 1][1]

  test('pause and resume carry the caller audio position and chunk index', () => {
    let audioMs = 5_000
    const tracker = trackAudioRecordingSession(FOLDER, {
      getVideoTimeMs: () => 42_000,
      getAudioMs: () => audioMs,
      getChunkIndex: () => 3,
    })

    jest.advanceTimersByTime(2_000)
    audioMs = 7_000
    tracker.pause()
    expect(lastEventBody()).toMatchObject({
      type: 'pause',
      video_time_ms: 42_000,
      audio_ms: 7_000,
      chunk_index: 3,
      elapsed_ms: 2_000,
    })

    jest.advanceTimersByTime(30_000)
    tracker.resume()
    expect(lastEventBody()).toMatchObject({ type: 'resume', audio_ms: 7_000, elapsed_ms: 32_000 })
  })

  test('leaves out audio_ms when no audio clock is given', () => {
    const tracker = trackAudioRecordingSession(FOLDER)

    jest.advanceTimersByTime(4_000)
    tracker.pause()
    jest.advanceTimersByTime(10_000)
    tracker.resume()

    expect(lastEventBody()).toMatchObject({ type: 'resume' })
    expect(lastEventBody()).not.toHaveProperty('audio_ms')
  })

  test('replays an earlier pause with its own position, or syncs state without logging', () => {
    const tracker = trackAudioRecordingSession(FOLDER, { getAudioMs: () => 9_000 })

    tracker.pause({ audioMs: 3_000, videoTimeMs: 10_000, chunkIndex: 1, at: 123 })
    expect(lastEventBody()).toMatchObject({
      type: 'pause',
      audio_ms: 3_000,
      video_time_ms: 10_000,
      chunk_index: 1,
      at: 123,
    })

    POST.mockClear()
    tracker.resume({ log: false })
    expect(POST).not.toHaveBeenCalled()
    expect(tracker.isPaused()).toBe(false)
  })
})
