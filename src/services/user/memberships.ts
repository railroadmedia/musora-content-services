/**
 * @module UserMemberships
 */
import './types.js'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config'

const baseUrl = `/api/user-memberships`

/**
 * Represents a user membership object
 */
export interface Membership {
  id: number
  user_id: number
  membership_type: string
  start_date: string
  expiration_date: string | null
  status: string
  created_at: string
  updated_at: string
  [key: string]: any
}

/**
 * Represents tokens for Shopify and Recharge integration
 */
export interface RechargeTokens {
  shopify_customer_access_token: string
  store_identifier: string
  recharge_storefront_access_token: string
  storefront_access_token: string
}

/**
 * Represents the response from subscription upgrade
 */
export interface UpgradeSubscriptionResponse {
  action: 'instant_upgrade' | 'shopify'
  message?: string
  url?: string
}

/**
 * Represents the response from RevenueCat purchase verification
 */
export interface RestorePurchasesResponse {
  success: boolean
  message?: string
  subscriber_status?: any
  [key: string]: any
}

/**
 * Fetches the authenticated user's memberships from the API.
 *
 * @returns {Promise<Array<Membership>>} - A promise that resolves to an array of membership objects.
 *
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * fetchMemberships()
 *   .then(memberships => console.log(memberships))
 *   .catch(error => console.error(error));
 */
export async function fetchMemberships(): Promise<Membership[]> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<Membership[]>(`${baseUrl}/v1`)
}

/**
 * Fetches tokens required for interacting with Shopify and Recharge.
 *
 * @returns {Promise<RechargeTokens>} - A promise that resolves to an object containing:
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
export async function fetchRechargeTokens(): Promise<RechargeTokens> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<RechargeTokens>(`${baseUrl}/v1/subscriptions-tokens`)
}

/**
 * Upgrades the user's subscription or provides a prefilled add-to-cart URL.
 *
 * @returns {Promise<UpgradeSubscriptionResponse>} A promise that resolves to an object containing either:
 *  - {string} action - The action performed (e.g., 'instant_upgrade').
 *  - {string} message - Success message if the subscription was upgraded immediately.
 *  OR
 *  - {string} action - The action performed (e.g., 'shopify').
 *  - {string} url - URL to the ecommerce store with prefilled add-to-cart parameters.
 *
 * @throws {Error} Throws an error if the request fails.
 *
 * @example
 * upgradeSubscription()
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function upgradeSubscription(): Promise<UpgradeSubscriptionResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<UpgradeSubscriptionResponse>(`${baseUrl}/v1/update-subscription`)
}

/**
 * Restores purchases by verifying subscriber status with RevenueCat.
 *
 * @param {string} originalAppUserId - The original app user ID from RevenueCat.
 * @param {string} [email] - (Optional) The user's email address.
 *
 * @returns {Promise<RestorePurchasesResponse>} - A promise that resolves to the verification response containing subscriber status.
 *
 * @throws {Error} - Throws an error if the request fails or if required parameters are missing.
 *
 * @example
 * restorePurchases('rc_user_123', 'user@example.com')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function restorePurchases(
  originalAppUserId: string,
  email?: string|null
): Promise<RestorePurchasesResponse> {
  if (!originalAppUserId) {
    throw new Error('originalAppUserId is a required parameter')
  }

  const requestBody: { original_app_user_id: string; email?: string } = {
    original_app_user_id: originalAppUserId
  }

  // Only include email if it has a valid value
  if (email) {
    requestBody.email = email
  }

  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<RestorePurchasesResponse>(
    `${baseUrl}/v1/revenuecat/verify-subscriber-status`,
    requestBody
  )
}
