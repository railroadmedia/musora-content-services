/**
 * @module UserNotifications
 */
import { fetchHandler } from '../railcontent.js'
import './types.js'

const baseUrl = `/api/notifications`

/**
 * Fetches notifications for a given brand with optional filters for unread status and limit.
 *
 * @param {Object} [options={}] - Options for fetching notifications.
 * @param {string} options.brand - The brand to filter notifications by. (Required)
 * @param {number} [options.limit=10] - The maximum number of notifications to fetch.
 * @param {boolean} [options.onlyUnread=false] - Whether to fetch only unread notifications. If true, adds `unread=1` to the query.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of notifications.
 *
 * @throws {Error} - Throws an error if the brand is not provided.
 *
 * @example
 * fetchNotifications({ brand: 'drumeo', limit: 5, onlyUnread: true })
 *   .then(notifications => console.log(notifications))
 *   .catch(error => console.error(error));
 */
export async function fetchNotifications({ brand = null, limit = 10, onlyUnread = false } = {}) {
  if (!brand) {
    throw new Error('brand is required')
  }

  const unreadParam = onlyUnread ? '&unread=1' : ''
  const url = `${baseUrl}/v1?brand=${brand}${unreadParam}&limit=${limit}`
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
 * @param {string} brand - The brand to filter notifications by.
 *
 * @returns {Promise<any>} - A promise that resolves when all notifications are marked as read.
 *
 * @example
 * markAllNotificationsAsRead('drumeo')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function markAllNotificationsAsRead(brand) {
  const url = `${baseUrl}/v1/read?brand=${brand}`
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
  if (!brand) {
    throw new Error('brand is required')
  }
  const url = `${baseUrl}/v1/unread-count?brand=${brand}`
  return fetchHandler(url, 'get')
}
