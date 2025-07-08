/**
 * @module UserNotifications
 */
import { fetchHandler } from '../railcontent.js'
import './types.js'

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
 * Marks all notifications as read for a specific brand.
 *
 * @returns {Promise<any>} - A promise that resolves when all notifications are marked as read.
 *
 * @example
 * markAllNotificationsAsRead('drumeo')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function markAllNotificationsAsRead() {
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
 * Fetches the count of unread notifications for the current user in a given brand context.
 *
 * @param {Object} [options={}] - Options for fetching unread count.
 * @param {string} options.brand - The brand to filter unread notifications by (required).
 * @returns {Promise<Object>} - A promise that resolves to an object with the unread count.
 *
 * @throws {Error} If the brand is not provided.
 *
 * @example
 * fetchUnreadCount({ brand: 'drumeo' })
 *   .then(data => console.log(data.unread_count))
 *   .catch(error => console.error(error));
 */
export async function fetchUnreadCount({ brand = null} = {}) {
  const url = `${baseUrl}/v1/unread-count`
  return fetchHandler(url, 'get')
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





