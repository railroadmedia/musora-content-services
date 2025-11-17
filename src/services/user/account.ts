/**
 * @module Accounts
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'
import { Onboarding } from './onboarding'
import { AuthResponse } from './types'

/**
 * @param {string} email - The email address to check the account status for.
 * @returns {Promise<{requires_setup: boolean}>} - A promise that resolves to an object indicating whether account setup is required, or an HttpError if the request fails.
 *
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function status(email: string): Promise<{ requires_setup: boolean }> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
  return response
}

/**
 * @param {string} email - The email address to send the account setup email to.
 * @returns {Promise<void>} - A promise that resolves when the email is sent or an HttpError if the request fails.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function sendAccountSetupEmail(email: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/send-setup-email`,
    {}
  )
}

export interface AccountSetupProps {
  email: string
  password: string
  passwordConfirmation: string
  token?: string
  revenuecatAppUserId?: string
  deviceName?: string
}

export interface AccountSetupResponse {
  auth: AuthResponse
  onboarding: Onboarding
}

/**
 * @param {Object} props - The parameters for setting up the account.
 * @property {string} email - The email address for the account.
 * @property {string} password - The new password for the account.
 * @property {string} passwordConfirmation - The confirmation of the new password.
 * @property {string} [token] - The token sent to the user's email for verification. Required for web requests
 * @property {string} [revenuecatAppUserId] - The RevenueCat App User ID for MA environments. Required for MA requests
 * @property {string} [deviceName] - The device name for MA environments. Required for MA requests
 *
 * @returns {Promise<void>} - A promise that resolves when the account setup is complete or an HttpError if the request fails.
 * @throws {Error} - Throws an error if required parameters are missing based on the environment.
 * @throws {HttpError} - Throws an HttpError if the HTTP request fails.
 */
export async function setupAccount(props: AccountSetupProps): Promise<AccountSetupResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  if (!globalConfig.isMA && !props.token) {
    throw new Error('Token is required for non-MA environments')
  }

  // NOTE: remove deviceName temporarily. It will be required late
  // if (globalConfig.isMA && (!props.deviceName || !props.revenuecatAppUserId)) {
  if (globalConfig.isMA && !props.revenuecatAppUserId) {
    throw new Error('Device name and RevenueCat App User ID are required for MA environments')
  }

  return httpClient.post<AccountSetupResponse>(`/api/user-management-system/v1/accounts`, {
    email: props.email,
    password: props.password,
    password_confirmation: props.passwordConfirmation,
    token: props.token,
    revenuecat_origin_app_user_id: props.revenuecatAppUserId,
    device_name: props.deviceName,
  })
}

/**
 * @param {string} email - The email address to send the password reset email to.
 * @returns {Promise<void>} - A promise that resolves when the email change request is made.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/accounts/password/reset-email`, {
    email,
  })
}

export interface PasswordResetProps {
  email: string
  password: string
  passwordConfirmation: string
  token: string
}
/**
 * @param {Object} params - The parameters for resetting the password.
 * @property {string} email - The email address for the account.
 * @property {string} password - The new password for the account.
 * @property {string} passwordConfirmation - The confirmation of the new password.
 * @property {string} token - The token sent to the user's email for verification.
 * @returns {Promise<void>} - A promise that resolves when the password reset is complete or an HttpError if the request fails.
 * @throws {HttpError} - Throws an HttpError if the HTTP request fails.
 */
export async function resetPassword({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/accounts/password/reset`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
}

/**
 * @param {string} email - The new email address to set for the user.
 * @param {string} password - The current password of the user for verification.
 * @returns {Promise<void>} - A promise that resolves when the email change request is made.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function requestEmailChange(email: string, password: string): Promise<void> {
  const apiUrl = `/api/user-management-system/v1/accounts/${globalConfig.sessionConfig.userId}/email-change`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { email, password })
}

/**
 * @param {string} token - The token sent to the user's email for verification.
 * @returns {Promise<void>} - A promise that resolves when the email change is confirmed.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function confirmEmailChange(token: string): Promise<void> {
  const apiUrl = `/api/user-management-system/v1/accounts/email-change/confirm`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { token })
}

/**
 * @param {number} userId - The ID of the user account to delete.
 * @returns {Promise<void>} - A promise that resolves with the anonymized user data or an HttpError if the request fails.
 */
export async function deleteAccount(userId: number): Promise<void> {
  const apiUrl = `/api/user-management-system/v1/users/${userId}`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.delete(apiUrl)
}

/**
 * Calls a public API endpoint to get the number of active users.
 *
 * @returns {Promise<number>} - A promise that resolves to the number of active users.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function numberOfActiveUsers(): Promise<number> {
  const apiUrl = `/api/user-management-system/v1/accounts/active/count`
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ active_users: number }>(apiUrl)
  return response.active_users
}

export interface UserResource {
  id: number
  email: string
  display_name: string
  first_name: string
  last_name: string
  permission_level: string
  use_student_view: boolean
  is_admin: boolean
  show_admin_toggle: boolean
  [key: string]: any // Allow additional properties from the API
}

/**
 * Toggles the student view mode for admin users.
 * When enabled, admins see the platform as a regular student would.
 *
 * @param {boolean} useStudentView - Whether to enable student view mode (true) or admin view mode (false).
 * @returns {Promise<UserResource>} - A promise that resolves to the updated user resource.
 * @throws {HttpError} - Throws HttpError if the request fails or user is not an admin.
 */
export async function toggleStudentView(useStudentView: boolean): Promise<UserResource> {
  const apiUrl = `/api/user-management-system/v1/user/student-view`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.patch<UserResource>(apiUrl, { use_student_view: useStudentView })
}
