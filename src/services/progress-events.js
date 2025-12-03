const listeners = new Set()
const completedListeners = new Set()

export function onProgressSaved(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitProgressSaved(event) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in progressSaved listener:', error)
    }
  })
}

export function onContentCompleted(listener) {
  completedListeners.add(listener)
  return () => completedListeners.delete(listener)
}

export function emitContentCompleted(contentId, collection) {
  const event = { contentId: contentId, collection: collection }
  completedListeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in contentConpleted listener:', error)
    }
  })
}
