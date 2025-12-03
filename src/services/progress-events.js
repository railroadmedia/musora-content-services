/**
 * @module ProgressEvents
 */

/**
 * @typedef {Object} ProgressSavedEvent
 * @property {number} contentId - Railcontent ID of the content item
 * @property {string} state - Progress state (started, completed)
 * @property {number} progressPercent - Completion percentage (0-100)
 */

/**
 * @callback ProgressSavedListener
 * @param {ProgressSavedEvent} event - The progress event data
 * @returns {void}
 */

const listeners = new Set()

/**
 * Register a listener to be notified when content progress is saved.
 * Use this to react to progress changes across the application.
 *
 * @param {ProgressSavedListener} listener - Function called when progress is saved
 * @returns {function(): void} Cleanup function to unregister the listener
 *
 * @example Listen for progress updates
 * const cleanup = onProgressSaved((event) => {
 *   console.log(`Content ${event.contentId}: ${event.progressPercent}%`)
 *   if (event.state === 'completed') {
 *     showCompletionAnimation()
 *   }
 * })
 *
 * // Later, when no longer needed:
 * cleanup()
 */
export function onProgressSaved(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Emit a progress saved event to all registered listeners.
 * Called internally when content progress is updated.
 *
 * @param {ProgressSavedEvent} event - The progress event to emit
 * @returns {void}
 */
export function emitProgressSaved(event) {
  listeners.forEach(listener => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in progressSaved listener:', error)
    }
  })
}
