import { awardEvents } from './award-events'
import { awardDefinitions } from './award-definitions'

const NUMERIC_ID_MODULO = 1000000

let awardGrantedCallback = null
let progressUpdateCallback = null

/**
 * Register a callback for when awards are granted
 * @param {Function} callback - Called with Award object when user earns an award
 * @returns {Function} Cleanup function to unregister
 */
export function registerAwardCallback(callback) {
  if (typeof callback !== 'function') {
    throw new Error('registerAwardCallback requires a function')
  }

  unregisterAwardCallback()

  awardGrantedCallback = async (payload) => {
    const { awardId, definition, completionData, popupMessage } = payload

    const award = {
      id: parseInt(awardId.split('-').join(''), 16) % NUMERIC_ID_MODULO,
      award_id: awardId,
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

/**
 * Unregister the award granted callback
 */
export function unregisterAwardCallback() {
  if (awardGrantedCallback) {
    awardEvents.off('awardGranted', awardGrantedCallback)
    awardGrantedCallback = null
  }
}

/**
 * Register a callback for award progress updates
 * @param {Function} callback - Called with { awardId, progressPercentage }
 * @returns {Function} Cleanup function to unregister
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

/**
 * Unregister the progress update callback
 */
export function unregisterProgressCallback() {
  if (progressUpdateCallback) {
    awardEvents.off('awardProgress', progressUpdateCallback)
    progressUpdateCallback = null
  }
}
