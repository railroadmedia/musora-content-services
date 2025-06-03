/**
 * @module UserNotifications
 */
import { fetchHandler } from '../railcontent.js'
import './types.js'

const baseUrl = `/api/notifications`

/**
 * Fetches unread notifications for a given brand with an optional limit.
 *
 * @param {Object} [options={}] - Options for fetching notifications.
 * @param {string} options.brand - The brand to filter notifications by. (Required)
 * @param {number} [options.limit=10] - The maximum number of notifications to fetch.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of unread notifications.
 *
 * @throws {Error} - Throws an error if the brand is not provided.
 *
 * @example
 * fetchNotifications({ brand: 'drumeo', limit: 5 })
 *   .then(notifications => console.log(notifications))
 *   .catch(error => console.error(error));
 */
export async function fetchNotifications({ brand = null, limit = 10 } = {}) {
  if (!brand) {
    throw new Error('brand is required')
  }
  const url = `${baseUrl}/v1?unread=1&brand=${brand}&limit=${limit}`
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
