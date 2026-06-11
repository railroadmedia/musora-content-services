/**
 * @module UserMemberships
 */
import './types.js'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config'
import { MultiUserAccountResponse } from "../multi-user-accounts/multi-user-accounts";

const baseUrl = `/api/user-memberships`
// Magic stringed to MembershipController.php
const multiUserAccountFeatureFlag = 'multi_user_account_feature_flag'

// Active Purchased Subscription Data
export interface MembershipData {
  type: string
  name: string
  expiration_date: string
  is_in_trial: boolean
  trial_duration: string
  never_expires: boolean
}

export interface UserMembershipResponse {
  user_membership_data: MembershipData[]
  can_upgrade_membership: boolean // pre multiUserAccount data
  sub_account_data: MultiUserAccountResponse // post multiUserAccount data
  upgrade_options: UpgradeOption[] // post multiuser account data
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

export interface UpgradeSubscriptionResponse {
  action: 'instant_upgrade' | 'shopify'
  message?: string
  url?: string
}

export interface UpgradeProduct {
  id: number
  name: string
  sku: string
  price: number
  monthly_price: number
  includes_trial: boolean
  tier: 'plus' | 'basic' | '' // deprecated in favour of membership_level
  membership_level: 'plus' | 'basic' | ''
  plan_type: 'family' | 'duo' | 'solo'
}

export interface UpgradeOption {
  annual_savings: number
  lowest_monthly_cost: number
  products: UpgradeProduct[] // annual + monthly products, or solely annual product with the same configuration information
}


/**
 * Represents the response when user should create an account (no entitlements or user not found)
 */
export interface RestorePurchasesCreateAccountResponse {
  shouldCreateAccount: true
  originalAppUserId?: string
}

/**
 * Represents the response when user should login
 */
export interface RestorePurchasesShouldLoginResponse {
  shouldLogin: true
  email: string
}

/**
 * Represents the response when user is authenticated successfully
 */
export interface RestorePurchasesSuccessResponse {
  success: boolean
  token: string
  tokenType: string
  userId: number
}

/**
 * Represents the response when user should setup an account (entitlements found but account requires setup)
 */
export interface RestorePurchasesSetupAccountResponse {
  shouldSetupAccount: true
  email: string
  originalAppUserId: string
}

/**
 * Represents response for latest subscription platform as best we can determine.
 */
export interface SubscriptionPlatform {
  last_platform: 'ios' | 'android' | 'web' | null
  has_active_platform_subscription: boolean
}

/**
 * Represents all possible responses from RevenueCat purchase restoration
 */
export type RestorePurchasesResponse =
  | RestorePurchasesCreateAccountResponse
  | RestorePurchasesShouldLoginResponse
  | RestorePurchasesSuccessResponse
  | RestorePurchasesSetupAccountResponse

export async function fetchMemberships(): Promise<UserMembershipResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<UserMembershipResponse>(`${baseUrl}/v1`)
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
 * @param {boolean} featureFlag - MultiUserAccount feature Flag - default false
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
export async function upgradeSubscription(featureFlag = false): Promise<UpgradeSubscriptionResponse> {
  let featureFlagValue = featureFlag ? 1 : 0
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<UpgradeSubscriptionResponse>(`${baseUrl}/v1/update-subscription?${multiUserAccountFeatureFlag}=${featureFlagValue}`)
}

/**
 * Restores purchases by verifying subscriber status with RevenueCat.
 *
 * This function verifies the subscriber's status with RevenueCat and attempts to sync their
 * subscription data with the platform. The backend will search for a user by email (if provided)
 * or by the RevenueCat original app user ID.
 *
 * @param {string} originalAppUserId - The original app user ID from RevenueCat.
 * @param {string} [email] - (Optional) The user's email address. If provided and a user with this
 *                           email exists, their subscription will be synced. If omitted, the backend
 *                           will only search by the RevenueCat original app user ID.
 *
 * @returns {Promise<RestorePurchasesResponse>} - A promise that resolves to one of three possible responses:
 *
 * **Case 1: Should Create Account** (No active entitlements OR user not found with active entitlements)
 *  - {boolean} shouldCreateAccount - Always true
 *  - {string} [originalAppUserId] - RevenueCat ID to link when creating account (only if user has entitlements)
 *
 * **Case 2: Should Login** (User exists but not currently authenticated)
 *  - {boolean} shouldLogin - Always true
 *  - {string} email - The email address of the found user
 *
 * **Case 3: Success** (User authenticated and synced successfully)
 *  - {boolean} success - Always true
 *  - {string} token - Authentication token
 *  - {string} tokenType - Token type 'bearer'
 *  - {number} userId - The user's ID
 *
 * @throws {Error} - Throws an error if the request fails or if required parameters are missing.
 *
 * @example
 * // With email
 * restorePurchases('rc_user_123', 'user@example.com')
 *   .then(response => {
 *     if ('shouldCreateAccount' in response) {
 *       // Handle account creation
 *     } else if ('shouldLogin' in response) {
 *       // Handle login with response.email
 *     } else if ('success' in response) {
 *       // Handle successful authentication with response.token
 *     }
 *   })
 *   .catch(error => console.error(error));
 *
 * @example
 * // Without email (search by original app user ID only)
 * restorePurchases('rc_user_123')
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
    `${baseUrl}/v1/revenuecat/restore`,
    requestBody
  )
}

/**
 * Get the upgrade price from Basic to Plus membership.
 * Returns the price based on the user's subscription interval.
 *
 * @param {boolean} featureFlag - MultiUserAccount feature Flag - default false
 *
 * For monthly subscribers: Returns the monthly upgrade cost (difference between Plus and Base monthly prices, ~$5/month)
 * For yearly subscribers: Returns the monthly equivalent upgrade cost ($3.33/month from $40/year)
 * For lifetime subscribers: Returns the annual upgrade cost for songs add-on ($40/year)
 * If interval cannot be determined: Defaults to monthly price
 *
 * @returns {Promise<{price: number, currency: string, period: string|null}>} - The upgrade price information
 * @property {number} price - The upgrade cost in USD (monthly for month/year, annual for lifetime)
 * @property {string} currency - The currency
 * @property {string|null} period - The billing period for the price ('month' or 'year'). Note: lifetime subscribers return 'year' period with annual price
 *
 * @example
 * getUpgradePrice()
 *   .then(info => {
 *     console.log(`Upgrade price: $${info.price} per ${info.period}`)
 *     // Example outputs:
 *     // Monthly: "Upgrade price: $5 per month"
 *     // Yearly: "Upgrade price: $3.33 per month"
 *     // Lifetime: "Upgrade price: $40 per year"
 *   })
 *   .catch(error => {
 *     console.error('Failed to fetch upgrade price:', error)
 *   })
 */
export async function getUpgradePrice(featureFlag = false) {
  let featureFlagValue = featureFlag ? 1 : 0
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return  httpClient.get(`${baseUrl}/v1/upgrade-price?${multiUserAccountFeatureFlag}=${featureFlagValue}`)
}

/**
 * @returns {Promise<'ios' | 'android' | 'web' | null>} The platform of the user's last known subscription
 */
export async function fetchLastSubscriptionPlatform(): Promise<'ios' | 'android' | 'web' | null> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<SubscriptionPlatform>(`${baseUrl}/v1/subscription-platform`)
  return response.last_platform
}

/**
* @returns {Promise<boolean>} Whether the user has any subscription from a known platform (web, ios, android)
*/
export async function fetchHasActivePlatformSubscription(): Promise<boolean> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<SubscriptionPlatform>(`${baseUrl}/v1/subscription-platform`)
  return response.has_active_platform_subscription
}
