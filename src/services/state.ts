import { streakCalculator } from './user/streakCalculator'

/**
 * Clears all client-side cached state in musora-content-services.
 * Should be called during logout to ensure no stale data persists
 * between user sessions.
 */
export function clearState(): void {
  streakCalculator.invalidate()
}
