/**
 * @module Accounts
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'

export interface PasswordResetProps {
  email: string
  password: string
  passwordConfirmation: string
  token: string
}

export interface AccountStatus {
  requires_setup: boolean
}

/**
 * @param {string} email - The email address to check the account status for.
 * @returns {Promise<Either<HttpError|AccountStatus>>} - A promise that resolves to an object indicating whether account setup is required, or an HttpError if the request fails.
 */
export async function status(email: string): Promise<Either<HttpError, AccountStatus>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
  return response
}

/**
 * @param {string} email - The email address to send the account setup email to.
 * @returns {Promise<Either<HttpError, void>>} - A promise that resolves when the email is sent or an HttpError if the request fails.
 */
export async function sendAccountSetupEmail(email: string): Promise<Either<HttpError, void>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/send-setup-email`,
    {}
  )
}

/**
 * @param {Object} params - The parameters for setting up the account.
 * @property {string} email - The email address for the account.
 * @property {string} password - The new password for the account.
 * @property {string} passwordConfirmation - The confirmation of the new password.
 * @property {string} token - The token sent to the user's email for verification.
 * @returns {Promise<Either<HttpError, void>} - A promise that resolves when the account setup is complete or an HttpError if the request fails.
 */
export async function setupAccount({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<Either<HttpError, void>> {
  return HttpClient.client().post<void>(`/api/user-management-system/v1/accounts`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
}

/**
 * @param {string} email - The email address to send the password reset email to.
 * @returns {Promise<void|HttpError>} - A promise that resolves when the email change request is made.
 */
export async function sendPasswordResetEmail(email: string): Promise<Either<HttpError, void>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/accounts/password/reset-email`, {
    email,
  })
}

/**
 * @param {Object} params - The parameters for resetting the password.
 * @property {string} email - The email address for the account.
 * @property {string} password - The new password for the account.
 * @property {string} passwordConfirmation - The confirmation of the new password.
 * @property {string} token - The token sent to the user's email for verification.
 * @returns {Promise<Either<HttpError, void>>} - A promise that resolves when the password reset is complete or an HttpError if the request fails.
 */
export async function resetPassword({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<Either<HttpError, void>> {
  return HttpClient.client().post<void>(`/api/user-management-system/v1/accounts/password/reset`, {
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
): Promise<Either<HttpError, void>> {
  const apiUrl = `/api/user-management-system/v1/accounts/${globalConfig.sessionConfig.userId}/email-change`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { email, password })
}

/**
 * @param {string} token - The token sent to the user's email for verification.
 * @returns {Promise<Either<HttpError, void>>} - A promise that resolves when the email change is confirmed.
 */
export async function confirmEmailChange(token: string): Promise<Either<HttpError, void>> {
  const apiUrl = `/api/user-management-system/v1/accounts/email-change/confirm`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { token })
}
