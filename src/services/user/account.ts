/**
 * @module Accounts
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'

/**
 * @param {string} email - The email address to check the account status for.
 * @returns {Promise<{requires_setup: boolean}>} - A promise that resolves to an object indicating whether account setup is required, or an HttpError if the request fails.
 *
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function status(email: string): Promise<{ requires_setup: boolean } | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
  return response
}

/**
 * @param {string} email - The email address to send the account setup email to.
 * @returns {Promise<void|HttpError>} - A promise that resolves when the email is sent or an HttpError if the request fails.
 */
export async function sendAccountSetupEmail(email: string): Promise<void | HttpError> {
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

/**
 * @param {Object} props - The parameters for setting up the account.
 * @property {string} email - The email address for the account.
 * @property {string} password - The new password for the account.
 * @property {string} passwordConfirmation - The confirmation of the new password.
 * @property {string|null} token - The token sent to the user's email for verification. Required for web requests
 * @property {string|null} revenuecatAppUserId - The RevenueCat App User ID for MA environments. Required for MA requests
 * @property {string|null} deviceName - The device name for MA environments. Required for MA requests
 *
 * @returns {Promise<void>} - A promise that resolves when the account setup is complete or an HttpError if the request fails.
 * @throws {Error} - Throws an error if required parameters are missing based on the environment.
 * @throws {HttpError} - Throws an HttpError if the HTTP request fails.
 */
export async function setupAccount(props: AccountSetupProps): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  if (!globalConfig.isMA && !props.token) {
    throw new Error('Token is required for non-MA environments')
  }

  if (globalConfig.isMA && (!props.deviceName || !props.revenuecatAppUserId)) {
    throw new Error('Device name and RevenueCat App User ID are required for MA environments')
  }

  return httpClient.post(`/api/user-management-system/v1/accounts`, {
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
 * @returns {Promise<void|HttpError>} - A promise that resolves when the email change request is made.
 */
export async function sendPasswordResetEmail(email: string): Promise<void | HttpError> {
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
 * @returns {Promise<void|HttpError>} - A promise that resolves when the password reset is complete or an HttpError if the request fails.
 */
export async function resetPassword({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<void | HttpError> {
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
 * @returns {Promise<void|HttpError>} - A promise that resolves when the email change request is made.
 */
export async function requestEmailChange(
  email: string,
  password: string
): Promise<void | HttpError> {
  const apiUrl = `/api/user-management-system/v1/accounts/${globalConfig.sessionConfig.userId}/email-change`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { email, password })
}

/**
 * @param {string} token - The token sent to the user's email for verification.
 * @returns {Promise<void|HttpError>} - A promise that resolves when the email change is confirmed.
 */
export async function confirmEmailChange(token: string): Promise<void | HttpError> {
  const apiUrl = `/api/user-management-system/v1/accounts/email-change/confirm`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { token })
}
