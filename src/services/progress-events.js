/**
 * @module ProgressEvents
 */

/**
 * @typedef {Object} ProgressSavedEvent
 * @property {number} userId - User ID
 * @property {number} contentId - Railcontent ID of the content item
 * @property {number} progressPercent - Completion percentage (0-100)
 * @property {string} progressStatus - Progress state (started, completed)
 * @property {boolean} bubble - Whether to bubble the event up to parent content
 * @property {string|null} collectionType - Collection type (learning-path, guided-course, etc.)
 * @property {number|null} collectionId - Collection ID if within a collection context
 * @property {number|null} resumeTimeSeconds - Resume position in seconds for video content
 * @property {number} timestamp - Unix timestamp when the event occurred
 */

/**
 * @callback ProgressSavedListener
 * @param {ProgressSavedEvent} event - The progress event data
 * @returns {void}
 */

const listeners = new Set()

/**
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
 * @param {ProgressSavedEvent} event - The progress event to emit
 * @returns {void}
 */
export function emitProgressSaved(event) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in progressSaved listener:', error)
    }
  })
}

/**
 * @typedef {Object} ContentCompletedEvent
 * @property {number} contentId - Railcontent ID of the completed content item
 * @property {Object|null} collection - Collection context information
 * @property {string} collection.type - Collection type (learning-path, guided-course, etc.)
 * @property {number} collection.id - Collection ID
 */

/**
 * @callback ContentCompletedListener
 * @param {ContentCompletedEvent} event - The content completion event data
 * @returns {void}
 */
const completedListeners = new Set()

/**
 * @param {ContentCompletedListener} listener - Function called when content is completed
 * @returns {function(): void} Cleanup function to unregister the listener
 *
 * @example Listen for content completion
 * const cleanup = onContentCompleted((event) => {
 *   console.log(`Content ${event.contentId} completed!`)
 *   if (event.collection) {
 *     console.log(`Within ${event.collection.type}: ${event.collection.id}`)
 *     checkCollectionProgress(event.collection.id)
 *   }
 * })
 *
 * // Later, when no longer needed:
 * cleanup()
 */
export function onContentCompleted(listener) {
  completedListeners.add(listener)
  return () => completedListeners.delete(listener)
}

/**
 * @param {number} contentId - The ID of the completed content item
 * @param {Object|null} collection - Collection context information
 * @returns {void}
 */
export function emitContentCompleted(contentId, collection) {
  const event = { contentId: contentId, collection: collection }
  completedListeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in contentCompleted listener:', error)
    }
  })
}
