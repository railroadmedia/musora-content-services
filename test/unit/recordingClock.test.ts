import { estimateClockOffset } from '../../src/services/audioRecording/recordingClock'

describe('estimateClockOffset', () => {
  const realPerformance = global.performance

  afterEach(() => {
    global.performance = realPerformance
  })

  function returnAfter(totalMs: number) {
    global.performance = { now: () => 1_000 + totalMs } as Performance
  }

  test('takes the server processing time out when the receive stamp is given', () => {
    returnAfter(300)

    // device 10_000 -> server receives at 10_550 (true offset 500, 50 ms out) -> 200 ms of work -> 50 ms back
    expect(estimateClockOffset(10_750, 10_000, 1_000, 10_550)).toEqual({
      offset_ms: 500,
      rtt_ms: 100,
    })
  })

  test('assumes the midpoint when there is no receive stamp', () => {
    returnAfter(300)

    expect(estimateClockOffset(10_750, 10_000, 1_000)).toEqual({ offset_ms: 600, rtt_ms: 300 })
  })

  test('ignores a receive stamp later than the response stamp', () => {
    returnAfter(300)

    expect(estimateClockOffset(10_750, 10_000, 1_000, 10_800)).toEqual({
      offset_ms: 600,
      rtt_ms: 300,
    })
  })

  test('returns null without a server time', () => {
    expect(estimateClockOffset(undefined, 10_000, 1_000, 10_550)).toBeNull()
  })
})
