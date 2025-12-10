/**
 * @module Awards
 */

import './types.js'
import { awardEvents } from './internal/award-events'

let awardGrantedCallback = null
let progressUpdateCallback = null

/**
 * @param {AwardCallbackFunction} callback - Function called with award data when an award is earned
 * @returns {UnregisterFunction} Cleanup function to unregister this callback
 *
 * @description
 * Registers a callback to be notified when the user earns a new award. Only one
 * callback can be registered at a time - registering a new one replaces the previous.
 * Always call the returned cleanup function when your component unmounts.
 *
 * The callback receives an award object with:
 * - `awardId` - Unique Sanity award ID
 * - `name` - Display name of the award
 * - `badge` - URL to badge image
 * - `completed_at` - ISO timestamp
 * - `completion_data.message` - Pre-generated congratulations message
 * - `completion_data.practice_minutes` - Total practice time
 * - `completion_data.days_user_practiced` - Days spent practicing
 * - `completion_data.content_title` - Title of completed content
 *
 * @example // React Native - Show award celebration modal
 * function useAwardNotification() {
 *   const [award, setAward] = useState(null)
 *
 *   useEffect(() => {
 *     return registerAwardCallback((awardData) => {
 *       setAward({
 *         title: awardData.name,
 *         badge: awardData.badge,
 *         message: awardData.completion_data.message,
 *         practiceMinutes: awardData.completion_data.practice_minutes
 *       })
 *     })
 *   }, [])
 *
 *   return { award, dismissAward: () => setAward(null) }
 * }
 *
 * @example // Track award in analytics
 * useEffect(() => {
 *   return registerAwardCallback((award) => {
 *     analytics.track('Award Earned', {
 *       awardId: award.awardId,
 *       awardName: award.name,
 *       practiceMinutes: award.completion_data.practice_minutes,
 *       contentTitle: award.completion_data.content_title
 *     })
 *   })
 * }, [])
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
 * @param {ProgressCallbackFunction} callback - Function called with progress data when award progress changes
 * @returns {UnregisterFunction} Cleanup function to unregister this callback
 *
 * @description
 * Registers a callback to be notified when award progress changes (but award is not
 * yet complete). Only one callback can be registered at a time. Use this to update
 * progress bars or show "almost there" encouragement.
 *
 * The callback receives:
 * - `awardId` - Unique Sanity award ID
 * - `progressPercentage` - Current completion percentage (0-99)
 *
 * Note: When an award reaches 100%, `registerAwardCallback` fires instead.
 *
 * @example // React Native - Update progress in learning path screen
 * function LearningPathScreen({ learningPathId }) {
 *   const [awardProgress, setAwardProgress] = useState({})
 *
 *   useEffect(() => {
 *     return registerProgressCallback(({ awardId, progressPercentage }) => {
 *       setAwardProgress(prev => ({
 *         ...prev,
 *         [awardId]: progressPercentage
 *       }))
 *     })
 *   }, [])
 *
 *   // Use awardProgress to update UI
 * }
 *
 * @example // Show encouragement toast at milestones
 * useEffect(() => {
 *   return registerProgressCallback(({ awardId, progressPercentage }) => {
 *     if (progressPercentage === 50) {
 *       showToast('Halfway to your award!')
 *     } else if (progressPercentage >= 90) {
 *       showToast('Almost there! Just a few more lessons.')
 *     }
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
