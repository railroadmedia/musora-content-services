import { GET } from '../../infrastructure/http/HttpClient.js'

/**
 * @module UserChat
 */

const baseUrl = `/api/user-management-system`

/**
 * Fetches chat settings for the current user, including token, API key, and channel names.
 *
 * @param {Object} [options={}] - Options for chat settings fetch.
 * @param {string|null} [options.brand=null] - The brand context (e.g., "drumeo", "singeo").
 * @param {boolean} [options.liveEventIsGlobal=false] - Whether the request is for a global live event.
 * @returns {Promise<Object>} - A promise that resolves to chat settings including token and channel names.
 *
 * @example
 * fetchChatSettings({ brand: 'singeo', liveEventIsGlobal: true })
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchChatSettings({ brand = null, liveEventIsGlobal = false } = {}) {
  const isGlobalEvent = liveEventIsGlobal ? '&is_global_event=1' : ''
  const url = `${baseUrl}/v1/users/chat?brand=${brand}${isGlobalEvent}`
  return await GET(url)
}
