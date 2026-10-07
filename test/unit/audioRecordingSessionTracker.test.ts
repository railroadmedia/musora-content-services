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
