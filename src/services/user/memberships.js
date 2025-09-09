/**
 * @module UserMemberships
 */
import { fetchHandler } from '../railcontent.js'
import './types.js'

const baseUrl = `/api/user-memberships`

/**
 * Fetches the authenticated user's memberships from the API.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of membership objects.
 *
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * fetchMemberships()
 *   .then(memberships => console.log(memberships))
 *   .catch(error => console.error(error));
 */
export async function fetchMemberships() {
  const url = `${baseUrl}/v1`
  return fetchHandler(url, 'get')
}

/**
 * Fetches tokens required for interacting with Shopify and Recharge.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - {string} shopify_customer_access_token - Shopify customer access token.
 *  - {string} store_identifier - The store domain identifier.
 *  - {string} recharge_storefront_access_token - Recharge storefront access token.
 *  - {string} storefront_access_token - Shopify storefront access token.
 *
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * fetchRechargeTokens()
 *   .then(tokens => console.log(tokens))
 *   .catch(error => console.error(error));
 */
export async function fetchRechargeTokens() {
  const url = `${baseUrl}/v1/subscriptions-tokens`
  return fetchHandler(url, 'get')
}





