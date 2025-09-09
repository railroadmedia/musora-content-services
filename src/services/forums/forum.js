/**
 * @module Forums
 */
import {fetchHandler} from "../railcontent";

const baseUrl = `/api/forums`

/**
 * Fetches forum discussions for the given brand.
 *
 * @param {Object} [options={}] - Options for fetching discussions.
 * @param {string|null} [options.brand=null] - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<Object>} - A promise that resolves to the list of discussions.
 *
 * @example
 * fetchForumDiscussions({ brand: 'singeo' })
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchForumDiscussions({ brand = null} = {}) {
  const url = `${baseUrl}/v1/discussions?brand=${brand}`
  return fetchHandler(url, 'get')
}
