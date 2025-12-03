/**
 * 
 * Event-driven system for award notifications
 * Allows frontend to display popups and UI updates when awards are earned
 */


/**  @typedef {Object} AwardGrantedPayload */
/**  @typedef {Object} AwardProgressPayload */
/**  @callback AwardGrantedListener */
/**  @callback AwardProgressListener */


class AwardEventsService {
  constructor() {
    /** @type {Set<AwardGrantedListener>} */
    this.awardGrantedListeners = new Set()

    /** @type {Set<AwardProgressListener>} */
    this.awardProgressListeners = new Set()
  }

  /**
   * Subscribe to award granted events
   * @param {'awardGranted' | 'awardProgress'} event - Event name
   * @param {AwardGrantedListener | AwardProgressListener} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  on(event, listener) {
    if (event === 'awardGranted') {
      this.awardGrantedListeners.add(listener)
      return () => this.awardGrantedListeners.delete(listener)
    } else if (event === 'awardProgress') {
      this.awardProgressListeners.add(listener)
      return () => this.awardProgressListeners.delete(listener)
    }
    return () => {}
  }

  /**
   * Subscribe once to award granted event
   * @param {'awardGranted' | 'awardProgress'} event - Event name
   * @param {AwardGrantedListener | AwardProgressListener} listener - Listener function
   * @returns {void}
   */
  once(event, listener) {
    const wrappedListener = (...args) => {
      this.off(event, wrappedListener)
      listener(...args)
    }
    this.on(event, wrappedListener)
  }

  /**
   * Unsubscribe from award events
   * @param {'awardGranted' | 'awardProgress'} event - Event name
   * @param {AwardGrantedListener | AwardProgressListener} listener - Listener function
   * @returns {void}
   */
  off(event, listener) {
    if (event === 'awardGranted') {
      this.awardGrantedListeners.delete(listener)
    } else if (event === 'awardProgress') {
      this.awardProgressListeners.delete(listener)
    }
  }

  /**
   * Emit award granted event
   * Called internally when an award is completed
   * @param {AwardGrantedPayload} payload - Event payload
   * @returns {void}
   */
  emitAwardGranted(payload) {
    this.awardGrantedListeners.forEach(listener => {
      try {
        listener(payload)
      } catch (error) {
        console.error('Error in awardGranted listener:', error)
      }
    })
  }

  /**
   * Emit award progress event
   * Called internally when award progress updates
   * @param {AwardProgressPayload} payload - Event payload
   * @returns {void}
   */
  emitAwardProgress(payload) {
    this.awardProgressListeners.forEach(listener => {
      try {
        listener(payload)
      } catch (error) {
        console.error('Error in awardProgress listener:', error)
      }
    })
  }

  /**
   * Remove all listeners
   * @returns {void}
   */
  removeAllListeners() {
    this.awardGrantedListeners.clear()
    this.awardProgressListeners.clear()
  }

  /**
   * Get listener counts (for debugging)
   * @returns {Object} Listener counts
   */
  getListenerCounts() {
    return {
      awardGranted: this.awardGrantedListeners.size,
      awardProgress: this.awardProgressListeners.size
    }
  }
}


export const awardEvents = new AwardEventsService()
