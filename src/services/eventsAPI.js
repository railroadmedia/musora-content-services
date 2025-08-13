import {fetchLiveEventPollingState, fetchUnreadCount, pauseLiveEventPolling} from "./user/notifications"
import {fetchLiveEvent} from "./sanity"
import { DataContext, PollingStateVersionKey } from './dataContext'

const pollingStateContext = new DataContext(PollingStateVersionKey, fetchLiveEventPollingState)

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

  async initialize({ brand = 'drumeo' } = {}) {
    this.brand = brand;
    await this.setupAutoEvents();
    await this.checkNotifications();
  }
  // Add event handler
  addNotificationStateUpdatedHandler(callback) {
    this.onNotificationStateUpdated.push(callback);
    return () => this.removeNotificationStateUpdatedHandler(callback);
  }

  // Remove event handler
  removeNotificationStateUpdatedHandler(callback) {
    const index = this.onNotificationStateUpdated.indexOf(callback);
    if (index > -1) {
      this.onNotificationStateUpdated.splice(index, 1);
    }
  }

  triggerNotificationStateUpdated(notifications) {
    this.onNotificationStateUpdated.forEach(callback => {
      try {
        callback(notifications);
      } catch (error) {
        console.error('Error in onNotificationStateUpdated callback:', error);
      }
    });
  }

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
      console.error('rox:: EventsApi: Failed to setup auto events:', error);
      this.checkNotifications();
    }
  }

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

  async pauseLiveEventCheck(ttlMs) {
    this.isLiveEventPollingActive = false;
    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
    }
    if (typeof ttlMs !== 'number') {
      try {
        const liveEvent = await fetchLiveEvent(this.brand);
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

  resumeLiveEventCheck() {
    this.isLiveEventPollingActive = true;
    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
      this.resumeLiveEventTimeout = null;
    }
  }
}

// Export singleton
const eventsAPI = new EventsAPI();
export default eventsAPI;
