/**
 * @module MultiUserAccounts
 */
import { HttpClient, DELETE } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'

const baseUrl = `/api/multi-user-accounts/v1`

export interface User {
  id: number
  display_name: string
  email: string
  profile_picture_url: string | null
}

export interface InviteResponse {
  email: string
  id: number
  created_at: string
  expires_at: string
  existing_user_details: User
}

export interface UsersMultiAccountResponse {
  user_id: number
  active_multi_user_account: MultiUserAccountResponse
  last_cancelled_multi_user_account: MultiUserAccountResponse
  is_active_primary: boolean
  is_active_sub: boolean
  active_invite: InviteResponse
}

export interface MultiUserAccountResponse {
  id: number
  product_name: string
  is_active: boolean
  primary_user: User
  active_invited_emails: string[]
  available_seats: number
  available_invites: number
  total_seats: number
  active_subs: User[]
  end_time: string
  is_primary_account_holder: boolean
}

export interface CreateAccountParams {
  emails?: string[]
}

export interface CreateInvitesParams {
  multi_user_account_id: number
  emails: string[]
}

export interface UpdateMultiUserAccountParams {
  show_welcome: boolean
}


/**
 * Creates a new multi-user account with optional invites and seat count.
 *
 * @param {CreateAccountParams} params - The parameters for creating the account.
 * @returns {Promise<MultiUserAccountResponse>} - A promise that resolves to the created account.
 * @throws {HttpError} - If the request fails.
 */
export async function createAccount(params: CreateAccountParams): Promise<MultiUserAccountResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<MultiUserAccountResponse>(`${baseUrl}/`, params)
}

/**
 * Fetches multi-user account details for a specific user.
 *
 * @param {number} userId - The ID of the user to fetch account details for.
 * @returns {Promise<UsersMultiAccountResponse>} - A promise that resolves to the account details.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchUsersMultiAccountDetails(userId: number): Promise<UsersMultiAccountResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<UsersMultiAccountResponse>(`${baseUrl}/${userId}/details`)
}

/**
 * Creates invitations for an existing multi-user account.
 *
 * @param {CreateInvitesParams} params - The parameters for creating invites.
 * @returns {Promise<MultiUserAccountResponse>} - A promise that resolves to the updated account.
 * @throws {HttpError} - If the request fails.
 */
export async function createInvites(params: CreateInvitesParams): Promise<MultiUserAccountResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<MultiUserAccountResponse>(`${baseUrl}/invites`, params)
}

/**
 * Accepts an invitation to join a multi-user account.
 *
 * @param {number} inviteId - The ID of the invitation to accept.
 * @returns {Promise<void>} - A promise that resolves when the invite is accepted.
 * @throws {HttpError} - If the request fails.
 */
export async function acceptInvite(inviteId: number): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/invites/${inviteId}/accept`, {})
}

/**
 * Rescinds/cancels an invitation to join a multi-user account.
 *
 * @param {number} inviteId - The ID of the invitation to rescind.
 * @returns {Promise<void>} - A promise that resolves when the invite is rescinded.
 * @throws {HttpError} - If the request fails.
 */
export async function rescindInvite(inviteId: number): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/invites/${inviteId}/rescind`, {})
}


/**
 * Removes a member from a multi-user account. authorized user must be the primary account owner, or the user passed
 *
 * @param {number} userId - Id of the user to remove
 * @returns {Promise<void|MultiUserAccountResponse>} - Updated MultiUserAccountResponse if account owner, void if active user
 * @throws {HttpError} - If the request fails.
 */
export async function removeUserFromActiveMultiUserAccount(userId: number): Promise<MultiUserAccountResponse|void> {
  return DELETE(`${globalConfig.baseUrl}${baseUrl}/${userId}/remove`, {})
}

/**
 * Updates specified fields on a multi-user account. Authorized user must be the primary account owner
 *
 * @param {UpdateMultiUserAccountParams} params - The parameters for updating the account.
 * @returns {Promise<MultiUserAccountResponse>} - Updated MultiUserAccountResponse if account owner
 * @throws {HttpError} - If the request fails.
 */
export async function updateMultiUserAccount(params: UpdateMultiUserAccountParams): Promise<MultiUserAccountResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.patch(`${globalConfig.baseUrl}${baseUrl}/update`, params)
}
