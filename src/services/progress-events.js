const listeners = new Set()

export function onProgressSaved(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitProgressSaved(event) {
  listeners.forEach(listener => {
    try {
      listener(event)
    } catch (error) {
      console.error('Error in progressSaved listener:', error)
    }
  })
}
