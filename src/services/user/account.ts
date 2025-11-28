/**
 * @module Accounts
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'
import { Onboarding } from './onboarding'
import { AuthResponse } from './types'

export interface AccountStatus {
  requires_setup: boolean
}

/**
 * @param {string} email - The email address to check the account status for.
 * @returns {Promise<Either<HttpError|AccountStatus>>} - A promise that resolves to an object indicating whether account setup is required, or an HttpError if the request fails.
 */
export async function status(email: string): Promise<Either<HttpError, AccountStatus>> {
  return HttpClient.client().get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
}

/**
 * @param {string} email - The email address to send the account setup email to.
 * @returns {Promise<Either<HttpError, void>>} - A promise that resolves when the email is sent or an HttpError if the request fails.
 */
export async function sendAccountSetupEmail(email: string): Promise<Either<HttpError, void>> {
  return HttpClient.client().post<void>(
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
  from?: string
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
 * @returns {Promise<void>} - A promise that resolves when the email change request is made.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function sendPasswordResetEmail(email: string): Promise<Either<HttpError, void>> {
  return HttpClient.client().post(`/api/user-management-system/v1/accounts/password/reset-email`, {
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
 * @returns {Promise<void>} - A promise that resolves when the email change request is made.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function requestEmailChange(
  email: string,
  password: string
): Promise<Either<HttpError, void>> {
  const apiUrl = `/api/user-management-system/v1/accounts/${globalConfig.sessionConfig.userId}/email-change`
  return HttpClient.client().post(apiUrl, { email, password })
}

/**
 * @param {string} token - The token sent to the user's email for verification.
 * @returns {Promise<Either<HttpError, void>>} - A promise that resolves when the email change is confirmed.
 */
export async function confirmEmailChange(token: string): Promise<Either<HttpError, void>> {
  const apiUrl = `/api/user-management-system/v1/accounts/email-change/confirm`
  return HttpClient.client().post(apiUrl, { token })
}

/**
 * @param {number} userId - The ID of the user account to delete.
 * @returns {Promise<void>} - A promise that resolves with the anonymized user data or an HttpError if the request fails.
 */
export async function deleteAccount(userId: number): Promise<Either<HttpError, void>> {
  const apiUrl = `/api/user-management-system/v1/users/${userId}`
  return HttpClient.client().delete<void>(apiUrl)
}

/**
 * Calls a public API endpoint to get the number of active users.
 *
 * @returns {Promise<number>} - A promise that resolves to the number of active users.
 * @throws {HttpError} - Throws HttpError if the request fails.
 */
export async function numberOfActiveUsers(): Promise<Either<HttpError, number>> {
  const apiUrl = `/api/user-management-system/v1/accounts/active/count`
  const response = await HttpClient.client().get<{ active_users: number }>(apiUrl)
  return response.map((data) => data.active_users)
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
export async function toggleStudentView(
  useStudentView: boolean
): Promise<Either<HttpError, UserResource>> {
  const apiUrl = `/api/user-management-system/v1/user/student-view`
  return HttpClient.client().patch<UserResource>(apiUrl, { use_student_view: useStudentView })
}
