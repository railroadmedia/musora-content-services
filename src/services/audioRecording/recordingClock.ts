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
 * Server clock minus device clock from one round trip, taking the server stamp as the
 * midpoint of the request.
 */
export function estimateClockOffset(
  serverNowMs: unknown,
  sentAtMs: number,
  sentMonotonicMs: number
): ClockOffset | null {
  if (typeof serverNowMs !== 'number' || !Number.isFinite(serverNowMs)) return null
  const rttMs = Math.max(0, Math.round(monotonicNow() - sentMonotonicMs))
  return { offset_ms: Math.round(serverNowMs - (sentAtMs + rttMs / 2)), rtt_ms: rttMs }
}
