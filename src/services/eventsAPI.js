import {fetchLiveEventPollingState, fetchUnreadCount, pauseLiveEventPolling} from "./user/notifications"
import {fetchLiveEvent} from "./sanity"
import { DataContext, PollingStateVersionKey } from './dataContext'

const pollingStateContext = new DataContext(PollingStateVersionKey, fetchLiveEventPollingState)

/**
 * API for managing notifications and live event polling.
 */
class EventsAPI {
  constructor() {
    this.brand = 'drumeo'
    this.onNotificationStateUpdated = []
    this.pollingInterval = null
    this.isLiveEventPollingActive = true
    this.resumeLiveEventTimeout = null
  }

  async initPollingControl() {
    return pollingStateContext.getData();
  }

  /**
   * Initializes the EventsAPI, setting the brand and starting auto events.
   * @param {Object} [options]
   * @param {string} [options.brand='drumeo'] - Brand identifier.
   */
  async initialize({ brand = 'drumeo' } = {}) {
    this.brand = brand;
    await this.setupAutoEvents();
    await this.checkNotifications();
  }
  /**
   * Adds a callback for when the notification state updates.
   * @param {(notifications: { unreadCount: number, liveEvent: any }) => void} callback
   * @returns {() => void} Function to remove the handler.
   */
  addNotificationStateUpdatedHandler(callback) {
    this.onNotificationStateUpdated.push(callback);
    return () => this.removeNotificationStateUpdatedHandler(callback);
  }

  /**
   * Removes a previously added notification state update callback.
   * @param {Function} callback
   */
  removeNotificationStateUpdatedHandler(callback) {
    const index = this.onNotificationStateUpdated.indexOf(callback);
    if (index > -1) {
      this.onNotificationStateUpdated.splice(index, 1);
    }
  }

  /**
   * Triggers all notification state update callbacks.
   * @param {Object} notifications
   * @param {number} notifications.unreadCount
   * @param {any} notifications.liveEvent
   */
  triggerNotificationStateUpdated(notifications) {
    this.onNotificationStateUpdated.forEach(callback => {
      try {
        callback(notifications);
      } catch (error) {
        console.error('Error in onNotificationStateUpdated callback:', error);
      }
    });
  }

  /**
   * Sets up automatic polling for notifications.
   */
  async setupAutoEvents() {
    try {
      const pollingData = await this.initPollingControl();
      const pauseUntil = Date.parse(pollingData?.pause_until); // UTC ms
      const now = Date.now(); // UTC ms
      const isPaused = pauseUntil > now;
      if (isPaused) {
        const ttlMs = pauseUntil - now;
        await this.pauseLiveEventCheck(ttlMs);
      }
      this.pollingInterval = setInterval(() => {
        this.checkNotifications();
      }, 60000);
    } catch (error) {
      console.error('EventsApi: Failed to setup auto events:', error);
      this.checkNotifications();
    }
  }


  /**
   * Checks for unread notifications and triggers callbacks.
   */
  async checkNotifications() {
    try {
      const notificationRes = await fetchUnreadCount({brand : this.brand });
      this.triggerNotificationStateUpdated({
        unreadCount: notificationRes.data,
        liveEvent : notificationRes.liveEvent || null,
      });
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  }

  /**
   * Pauses live event polling for a specified TTL or until the live event ends.
   * @param {number} ttlMs - Time to pause in milliseconds.
   */
  async pauseLiveEventCheck(ttlMs) {
    this.isLiveEventPollingActive = false;
    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
    }
    if (typeof ttlMs !== 'number') {
      try {
        const liveEvent = await fetchLiveEvent(this.brand);
        if(liveEvent == null || liveEvent.live_event_end_time == null){
          return;
        }
        const now = Date.now();
        const endTime = new Date(liveEvent.live_event_end_time).getTime();
        await pauseLiveEventPolling(this.brand);
        ttlMs = endTime - now;
      } catch (err) {
        console.error('Failed to fetch live event for TTL fallback:', err);
        return;
      }
    }

    if (ttlMs > 0) {
      this.resumeLiveEventTimeout = setTimeout(() => {
        this.resumeLiveEventCheck();
      }, ttlMs);
    }
  }

  /**
   * Resumes live event polling immediately.
   */
  resumeLiveEventCheck() {
    this.isLiveEventPollingActive = true;
    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
      this.resumeLiveEventTimeout = null;
    }
  }

  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
      this.resumeLiveEventTimeout = null;
    }

    this.onNotificationStateUpdated = [];
    this.isLiveEventPollingActive = false;
  }
}

// Export singleton
const eventsAPI = new EventsAPI();
export default eventsAPI;
