export interface ClockOffset {
  offset_ms: number
  rtt_ms: number
}

/**
 * Never jumps when the OS adjusts the wall clock, so durations measured with it stay exact.
 */
export function monotonicNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

/**
 * Server clock minus device clock from one round trip. With the server's receive stamp the
 * server's own processing time is taken out (the NTP formula); without it the response stamp
 * is assumed to sit at the midpoint of the request.
 */
export function estimateClockOffset(
  serverNowMs: unknown,
  sentAtMs: number,
  sentMonotonicMs: number,
  serverReceivedAtMs: unknown = null
): ClockOffset | null {
  if (typeof serverNowMs !== 'number' || !Number.isFinite(serverNowMs)) return null
  const totalMs = Math.max(0, monotonicNow() - sentMonotonicMs)
  const hasReceived =
    typeof serverReceivedAtMs === 'number' &&
    Number.isFinite(serverReceivedAtMs) &&
    serverReceivedAtMs <= serverNowMs
  if (!hasReceived) {
    return {
      offset_ms: Math.round(serverNowMs - (sentAtMs + totalMs / 2)),
      rtt_ms: Math.round(totalMs),
    }
  }
  const receivedAtMs = serverReceivedAtMs as number
  const receivedBackAtMs = sentAtMs + totalMs
  return {
    offset_ms: Math.round((receivedAtMs - sentAtMs + (serverNowMs - receivedBackAtMs)) / 2),
    rtt_ms: Math.max(0, Math.round(totalMs - (serverNowMs - receivedAtMs))),
  }
}
