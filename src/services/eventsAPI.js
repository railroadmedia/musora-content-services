import {fetchUnreadCount} from "./user/notifications"
import {fetchLiveEvent} from "./sanity"
import { DataContext, PollingStateVersionKey } from './dataContext'

async function fetchPollingState(version) {
  //TODO: Uncomment when backend is ready
//   const result = await fetch(`/api/user/polling-state?version=${version}`)
//   return await result
  return {
    "version": 1,
    "data": {
      "pauseLiveEventUntil": 3721180400000
    }
  }
}

const pollingStateContext = new DataContext(PollingStateVersionKey, fetchPollingState)

class EventsAPI {
  constructor() {
    this.onNotificationStateUpdated = []
    this.pollingInterval = null
    this.isPollingActive = true
    this.isLiveEventPollingActive = true
    this.resumeLiveEventTimeout = null
  }
  async initPollingControl() {
    return pollingStateContext.getData();
  }

  async initialize() {
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
    console.log('rox:: Setting up auto events...')
    try {
      const pollingData = await this.initPollingControl();
      console.log('rox:: Polling data..', pollingData);
      const now = Date.now();

      console.log('rox:: check pauseLiveEventUntil vs now...', pollingData?.pauseLiveEventUntil, now, pollingData?.pauseLiveEventUntil > now)
      if (pollingData?.pauseLiveEventUntil > now) {
        const ttlMs = pollingData.pauseLiveEventUntil - now;
        console.log('rox:: pauseLiveEventCheck..', ttlMs);
        await this.pauseLiveEventCheck(600000);
       // await this.pauseLiveEventCheck(Math.max(0, Math.floor(pollingData.pauseLiveEventUntil - now)));
      }

      this.pollingInterval = setInterval(() => {
          this.checkNotifications();
      }, 30000); // 30 seconds
    } catch (error) {
      console.error('rox:: EventsApi: Failed to setup auto events:', error);
      this.checkNotifications(); // still run at least once even if setup fails
    }
  }


  async checkNotifications() {
    try {
      const notificationRes = await fetchUnreadCount();

      let liveEvent = null;
      console.log('rox:: Checking for notifications and live events... isLive checking ----', this.isLiveEventPollingActive);
      if (this.isLiveEventPollingActive) {
        try {
          liveEvent = await fetchLiveEvent('drumeo');
        } catch (err) {
          console.error('rox:: Failed to fetch live event:', err);
        }
      }

      console.error('rox:: Check notifications from MCS:', notificationRes, liveEvent);

      this.triggerNotificationStateUpdated({
        unreadCount: notificationRes.data,
        liveEvent: liveEvent,
      });
    } catch (error) {
      console.error('rox::   ..... Failed to check notifications:', error);
    }
  }

  async pauseLiveEventCheck(ttlMs) {
    console.log('rox:: pauseLiveEventCheck() called with ttlMs =', ttlMs);
    this.isLiveEventPollingActive = false;
    console.log('rox:: isLiveEventPollingActive set to FALSE');

    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
    }

    if (typeof ttlMs !== 'number') {
      try {
        const liveEvent = await fetchLiveEvent('drumeo');
        const now = Date.now();
        const endTime = new Date(liveEvent.live_event_end_time).getTime();
        ttlMs = endTime - now;
      } catch (err) {
        console.error('Failed to fetch live event for TTL fallback:', err);
        return; // don’t schedule resume if fetch fails
      }
    }

    if (ttlMs > 0) {
      console.log(`rox:: Pausing live event check for ${ttlMs / 1000}s`);
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
