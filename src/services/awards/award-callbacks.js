/**
 * @module Awards
 */

import './types.js'
import { awardEvents } from './internal/award-events'

let awardGrantedCallback = null
let progressUpdateCallback = null

/**
 * Register a callback function to be notified when the user earns a new award.
 * The callback receives an award object with completion data, badge URLs, and practice statistics.
 * Returns a cleanup function to unregister the callback when no longer needed.
 *
 * @param {AwardCallbackFunction} callback - Function called with award data when an award is earned
 * @returns {UnregisterFunction} Cleanup function to unregister this callback
 *
 * @example // Display award notification
 * const cleanup = registerAwardCallback((award) => {
 *   showNotification({
 *     title: award.name,
 *     message: award.completion_data.message,
 *     image: award.badge
 *   })
 * })
 *
 * // Later, when component unmounts:
 * cleanup()
 *
 * @example // Track award analytics
 * registerAwardCallback((award) => {
 *   analytics.track('Award Earned', {
 *     awardId: award.awardId,
 *     awardName: award.name,
 *     practiceMinutes: award.completion_data.practice_minutes,
 *     completedAt: award.completed_at
 *   })
 * })
 */
export function registerAwardCallback(callback) {
  if (typeof callback !== 'function') {
    throw new Error('registerAwardCallback requires a function')
  }

  unregisterAwardCallback()

  awardGrantedCallback = async (payload) => {
    const { awardId, definition, completionData, popupMessage } = payload

    const award = {
      awardId: awardId,
      name: definition.name,
      badge: definition.badge,
      completed_at: completionData.completed_at,
      completion_data: {
        completed_at: completionData.completed_at,
        days_user_practiced: completionData.days_user_practiced,
        message: popupMessage,
        practice_minutes: completionData.practice_minutes,
        content_title: completionData.content_title
      }
    }

    callback(award)
  }

  awardEvents.on('awardGranted', awardGrantedCallback)

  return unregisterAwardCallback
}

function unregisterAwardCallback() {
  if (awardGrantedCallback) {
    awardEvents.off('awardGranted', awardGrantedCallback)
    awardGrantedCallback = null
  }
}

/**
 * Register a callback function to be notified when award progress updates.
 * Use this to display progress bars or update UI as the user completes content toward an award.
 * Returns a cleanup function to unregister the callback when no longer needed.
 *
 * @param {ProgressCallbackFunction} callback - Function called with progress data when award progress changes
 * @returns {UnregisterFunction} Cleanup function to unregister this callback
 *
 * @example // Update progress bar
 * const cleanup = registerProgressCallback(({ awardId, progressPercentage }) => {
 *   const progressBar = document.getElementById(`award-${awardId}`)
 *   if (progressBar) {
 *     progressBar.style.width = `${progressPercentage}%`
 *     progressBar.textContent = `${progressPercentage}% Complete`
 *   }
 * })
 *
 * // Cleanup on unmount
 * return () => cleanup()
 *
 * @example // React state update
 * useEffect(() => {
 *   return registerProgressCallback(({ awardId, progressPercentage }) => {
 *     setAwardProgress(prev => ({
 *       ...prev,
 *       [awardId]: progressPercentage
 *     }))
 *   })
 * }, [])
 */
export function registerProgressCallback(callback) {
  if (typeof callback !== 'function') {
    throw new Error('registerProgressCallback requires a function')
  }

  unregisterProgressCallback()

  progressUpdateCallback = (payload) => {
    callback({
      awardId: payload.awardId,
      progressPercentage: payload.progressPercentage
    })
  }

  awardEvents.on('awardProgress', progressUpdateCallback)

  return unregisterProgressCallback
}

function unregisterProgressCallback() {
  if (progressUpdateCallback) {
    awardEvents.off('awardProgress', progressUpdateCallback)
    progressUpdateCallback = null
  }
}
