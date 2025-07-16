import {fetchLiveEventPoolingState, fetchUnreadCount, pauseLiveEventPoolingUntil} from "./user/notifications"
import {fetchLiveEvent} from "./sanity"
import { DataContext, PollingStateVersionKey } from './dataContext'
import {fetchHandler} from "./railcontent";
import {globalConfig} from "./config";
import {convertToTimeZone} from "./dateUtils";


const pollingStateContext = new DataContext(PollingStateVersionKey, fetchLiveEventPoolingState)

class EventsAPI {
  constructor() {
    this.brand = 'drumeo' // Default brand, can be overridden';
    this.onNotificationStateUpdated = []
    this.pollingInterval = null
    this.isPollingActive = true
    this.isLiveEventPollingActive = true
    this.resumeLiveEventTimeout = null

    this.cachedLiveEvent = null
    this.cachedLiveEventEndTime = 0
  }
  setBrand(brand) {
    this.brand = brand;
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
    console.log('rox:: Setting up auto events...');
    try {
      const pollingData = await this.initPollingControl();
      console.log('rox:: Polling data..', pollingData);

      const pauseUntil = Date.parse(pollingData?.pauseLiveEventUntil); // UTC ms
      const now = Date.now(); // UTC ms

      const isPaused = pauseUntil > now;
      if (isPaused) {
        const ttlMs = pauseUntil - now;
        console.log('rox:: pauseLiveEventCheck (ttlMs):', ttlMs);
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
      const notificationRes = await fetchUnreadCount();

      let liveEvent = null;
      const now = Date.now();

      if (this.isLiveEventPollingActive) {
        if (this.cachedLiveEvent && this.cachedLiveEventEndTime > now) {
          // Use cached live event
          liveEvent = this.cachedLiveEvent;
          console.log('rox:: Using cached live event');
        } else {
          try {
            liveEvent = await fetchLiveEvent(this.brand);

            if (liveEvent && liveEvent.live_event_end_time) {
              this.cachedLiveEvent = liveEvent;
              this.cachedLiveEventEndTime = new Date(liveEvent.live_event_end_time).getTime();
              console.log('rox:: Fetched and cached new live event until:', liveEvent.live_event_end_time);
            }
          } catch (err) {
            console.error('rox:: Failed to fetch live event:', err);
          }
        }
      }

   //   console.error('rox:: Check notifications from MCS:', notificationRes, liveEvent);

      this.triggerNotificationStateUpdated({
        unreadCount: notificationRes.data,
        liveEvent
      });
    } catch (error) {
      console.error('rox::   ..... Failed to check notifications:', error);
    }
  }

  async pauseLiveEventCheck(ttlMs) {
   // console.log('rox:: pauseLiveEventCheck() called with ttlMs =', ttlMs);
    this.isLiveEventPollingActive = false;
  //  console.log('rox:: isLiveEventPollingActive set to FALSE');

    if (this.resumeLiveEventTimeout) {
      clearTimeout(this.resumeLiveEventTimeout);
    }

    if (typeof ttlMs !== 'number') {
      try {
        const liveEvent = await fetchLiveEvent('drumeo');
        const now = Date.now();
        const endTime = new Date(liveEvent.live_event_end_time).getTime();
        console.error('rox:: pauseLiveEventPoolingUntil :', liveEvent.live_event_end_time);
        await pauseLiveEventPoolingUntil(liveEvent.live_event_end_time);
        ttlMs = endTime - now;
      } catch (err) {
        console.error('Failed to fetch live event for TTL fallback:', err);
        return; // don’t schedule resume if fetch fails
      }
    }

    if (ttlMs > 0) {
   //   console.log(`rox:: Pausing live event check for ${ttlMs / 1000}s`);
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
