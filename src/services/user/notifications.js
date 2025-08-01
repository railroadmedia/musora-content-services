/**
 * @module UserNotifications
 */
import { fetchHandler } from '../railcontent.js'
import './types.js'
import {fetchLiveEvent} from "../sanity";

const baseUrl = `/api/notifications`

const NotificationChannels = {
  EMAIL: 'email',
  PUSH: 'push',
  BELL: 'bell',
};

/**
 * Fetches notifications for a given brand with optional filters for unread status and limit.
 *
 * @param {Object} [options={}] - Options for fetching notifications.
 * @param {number} [options.limit=10] - The maximum number of notifications to fetch.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {boolean} [options.onlyUnread=false] - Whether to fetch only unread notifications. If true, adds `unread=1` to the query.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of notifications.
 *
 * @throws {Error} - Throws an error if the brand is not provided.
 *
 * @example
 * fetchNotifications({ limit: 5, onlyUnread: true,  page: 2  })
 *   .then(notifications => console.log(notifications))
 *   .catch(error => console.error(error));
 */
export async function fetchNotifications({ limit = 10, onlyUnread = false, page = 1 } = {}) {
  const unreadParam = onlyUnread ? '&unread=1' : ''
  const url = `${baseUrl}/v1?limit=${limit}&page=${page}${unreadParam}`
  return fetchHandler(url, 'get')
}

/**
 * Marks a specific notification as read.
 *
 * @param {number} notificationId - The ID of the notification to mark as read.
 *
 * @returns {Promise<any>} - A promise that resolves when the notification is successfully marked as read.
 *
 * @throws {Error} - Throws an error if notificationId is not provided.
 *
 * @example
 * markNotificationAsRead(123)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required')
  }

  const url = `${baseUrl}/v1/read?id=${notificationId}`
  return fetchHandler(url, 'put')
}

/**
 * Marks all notifications as read for the current user.
 *
 * This also pauses live event polling if there is an active event, to prevent immediate re-polling.
 *
 * @param {string} [brand='drumeo'] - The brand context for live event handling before marking notifications.
 * @returns {Promise<Object>} - A promise resolving to the API response from the notifications read endpoint.
 */
export async function markAllNotificationsAsRead(brand = 'drumeo') {
  await pauseLiveEventPolling(brand)
  const url = `${baseUrl}/v1/read`
  return fetchHandler(url, 'put')
}

/**
 * Marks a specific notification as unread.
 *
 * @param {number} notificationId - The ID of the notification to mark as unread.
 *
 * @returns {Promise<any>} - A promise that resolves when the notification is successfully marked as unread.
 *
 * @throws {Error} - Throws an error if notificationId is not provided.
 *
 * @example
 * markNotificationAsUnread(123)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function markNotificationAsUnread(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required')
  }

  const url = `${baseUrl}/v1/unread?id=${notificationId}`
  return fetchHandler(url, 'put')
}

/**
 * Deletes a specific notification.
 *
 * @param {number} notificationId - The ID of the notification to delete.
 *
 * @returns {Promise<any>} - A promise that resolves when the notification is successfully deleted.
 *
 * @throws {Error} - Throws an error if notificationId is not provided.
 *
 * @example
 * deleteNotification(123)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required')
  }
  const url = `${baseUrl}/v1/${notificationId}`
  return fetchHandler(url, 'delete')
}

/**
 * Restores a specific notification.
 *
 * @param {number} notificationId - The ID of the notification to restore.
 *
 * @returns {Promise<any>} - A promise that resolves when the notification is successfully restored.
 *
 * @throws {Error} - Throws an error if notificationId is not provided.
 *
 * @example
 * restoreNotification(123)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function restoreNotification(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required')
  }

  const url = `${baseUrl}/v1/${notificationId}`
  return fetchHandler(url, 'put')
}

/**
 * Fetches the count of unread notifications for the current user in a given brand context.
 *
 * This function first checks for standard unread notifications. If none are found,
 * it checks if live event polling is active. If so, it will query for any ongoing live events.
 * If a live event is active, it counts as an unread item.
 *
 * @param {Object} [options={}] - Options for fetching unread count.
 * @param {string} options.brand - The brand to filter unread notifications by. Defaults to 'drumeo'.
 * @returns {Promise<Object>} - A promise that resolves to an object with a `data` property indicating the unread count (0 or 1).
 *
 * @throws {Error} If the brand is not provided or if network requests fail.
 *
 * @example
 * fetchUnreadCount({ brand: 'drumeo' })
 *   .then(data => console.log(data.data)) // 0 or 1
 *   .catch(error => console.error(error));
 */
export async function fetchUnreadCount({ brand = 'drumeo'} = {}) {
  const url = `${baseUrl}/v1/unread-count`
  const notifUnread =  await fetchHandler(url, 'get')
  if (notifUnread.data > 0) {
    return notifUnread// Return early if unread notifications exist
  }
  const liveEventPollingState = await fetchLiveEventPollingState()
  if(liveEventPollingState.data?.read_state === true){
    const liveEvent = await fetchLiveEvent(brand)
    return { data: liveEvent ? 1 : 0}
  }
  return notifUnread
}

/**
 * Fetches the notification settings for the current user grouped by brand.
 *
 * @returns {Promise<Object>} A promise that resolves to an object where keys are brands and values are arrays of settings objects.
 *
 * @example
 * fetchNotificationSetting()
 *   .then(settings => {
 *     console.log(settings);
 *   })
 *   .catch(error => {
 *     console.error(error);
 *   });
 */
export async function fetchNotificationSettings() {
  const url = `/api/notifications/v1/settings`;
  const settings = await fetchHandler(url, 'get');

  if (!settings || typeof settings !== 'object') return {};

  const result = {};

  for (const [brand, brandSettings] of Object.entries(settings)) {
    result[brand] = Object.entries(brandSettings).map(([name, value]) => ({
      name,
      ...value,
    }));
  }

  return result;
}

/**
 * Updates notification settings for specified channels within a given brand.
 *
 * @param {Object} options - Options to update notification settings.
 * @param {string} options.brand - The brand context for the notification settings.
 * @param {string} options.settingName - The name of the notification setting to update (required).
 * @param {boolean} [options.email] - Whether email notifications are enabled or disabled.
 * @param {boolean} [options.push] - Whether push notifications are enabled or disabled.
 * @param {boolean} [options.bell] - Whether bell notifications are enabled or disabled.
 * @returns {Promise<Object>} - A promise that resolves to the server response after updating settings.
 *
 * @throws {Error} Throws an error if `settingName` is not provided or if no channels are specified.
 *
 * @example
 * updateNotificationSetting({
 *   brand: 'drumeo',
 *   settingName: 'new_lesson',
 *   email: true,
 *   push: false,
 *   bell: true
 * })
 * .then(response => console.log(response))
 * .catch(error => console.error(error));
 */
export async function updateNotificationSetting({ brand, settingName, email, push, bell } = {}) {
  if (!settingName) {
    throw new Error('The "settingName" parameter is required.');
  }

  const channelValues = {
    [NotificationChannels.EMAIL]: email,
    [NotificationChannels.PUSH]: push,
    [NotificationChannels.BELL]: bell,
  };

  const settings = Object.entries(channelValues)
    .filter(([, value]) => value !== undefined)
    .map(([channel, value]) => ({
      name: settingName,
      channel,
      value,
      brand,
    }));

  if (settings.length === 0) {
    throw new Error('At least one channel (email, push, or bell) must be provided.');
  }

  const payload = { settings };
  const url = '/api/notifications/v1/settings';

  return fetchHandler(url, 'PUT', null, payload);
}

/**
 * Pauses live event polling for the current user based on the live event end time.
 *
 * If a live event is active, polling will be paused until its end time. If no live event is found,
 * polling is not paused.
 *
 * @param {string} [brand='drumeo'] - The brand context to fetch live event data for.
 * @returns {Promise<Object>} - A promise resolving to the API response from the pause polling endpoint.
 */
export async function pauseLiveEventPolling(brand = 'drumeo') {
  const liveEvent = await fetchLiveEvent(brand)
  const until = liveEvent?.live_event_end_time || null
  const url = `/api/user-management-system/v1/users/pause-polling${until ? `?until=${until}` : ''}`
  return fetchHandler(url, 'PUT', null)
}

/**
 * Start live event polling.
 * @returns {Promise<Object>} - Promise resolving to the API response
 */
export async function startLiveEventPolling(brand = 'drumeo') {
  const url = `/api/user-management-system/v1/users/start-polling`
  return fetchHandler(url, 'PUT', null)
}

/**
 * Fetches the current live event polling state.
 + @returns {Promise<Object>} - Promise resolving to the polling state
 */

export async function fetchLiveEventPollingState() {
    const url = `/api/user-management-system/v1/users/polling`
    return fetchHandler(url, 'GET', null)
}





