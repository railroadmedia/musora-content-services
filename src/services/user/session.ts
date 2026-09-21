import { HttpClient } from '../../infrastructure/http/HttpClient'
import { Brand } from '../../lib/brands'
import { globalConfig } from '../config.js'
import { AuthResponse } from './types'

export interface VerifyOAuthTokenParams {
  id_token: string
  access_token?: string
  device_name: string
  device_token?: string
  platform?: 'ios' | 'android'
  user?: string
}

export type OAuthProvider = 'google' | 'apple'

export async function verifyOAuthToken(
  provider: OAuthProvider,
  params: VerifyOAuthTokenParams
): Promise<AuthResponse> {
  const apiUrl = `/api/user-management-system/v1/oauth/${encodeURIComponent(provider)}/verify`
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<AuthResponse>(apiUrl, params)
}

export interface RedirectToOAuthProviderOptions {
  redirect_to?: string
  flow?: string
  theme?: string
  [key: string]: string | undefined
}

export async function redirectToOAuthProvider(
  provider: OAuthProvider,
  options: RedirectToOAuthProviderOptions
): Promise<void> {
  const queryParams = new URLSearchParams(options as Record<string, string>).toString()
  const apiUrl = `/api/user-management-system/v1/oauth/${encodeURIComponent(provider)}/redirect?${queryParams}`
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get(apiUrl)
}

export async function listOAuthProviders(): Promise<OAuthProvider[]> {
  const userId = globalConfig.sessionConfig.userId
  const apiUrl = `/api/user-management-system/v1/sessions/${encodeURIComponent(userId)}/oauth`
  return new HttpClient(globalConfig.baseUrl).get<OAuthProvider[]>(apiUrl)
}

export async function unlinkOAuthProvider(provider: OAuthProvider): Promise<void> {
  const userId = globalConfig.sessionConfig.userId
  const apiUrl = `/api/user-management-system/v1/sessions/${encodeURIComponent(userId)}/oauth/${encodeURIComponent(provider)}`
  return new HttpClient(globalConfig.baseUrl).delete(apiUrl)
}

export async function loginAsUser(userId: string): Promise<AuthResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<AuthResponse>(
    `/api/user-management-system/v1/sessions/${encodeURIComponent(userId)}`,
    {}
  )
}

export interface MagicLinkAuthResponse extends AuthResponse {
  refresh_token: string | null
  redirect_to: string | null
}

export interface MagicLinkDeviceParams {
  device_name?: string
  device_token?: string
  platform?: 'ios' | 'android'
}

/**
 * Resolves whether or not an account exists for the email, so the endpoint
 * cannot be used to discover which addresses are registered.
 *
 * The brand drives the email subject and call-to-action copy.
 */
export async function requestMagicLoginLink(
  email: string,
  brand: Brand,
  redirectTo: string | null = null
): Promise<void> {
  const apiUrl = '/api/user-management-system/v1/sessions/magic-link'
  const httpClient = new HttpClient(globalConfig.baseUrl)
  await httpClient.post(apiUrl, { email, brand, redirect_to: redirectTo })
}

export async function loginWithMagicLink(
  email: string,
  token: string,
  params: MagicLinkDeviceParams = {}
): Promise<MagicLinkAuthResponse> {
  const apiUrl = '/api/user-management-system/v1/sessions/magic-link/exchange'
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<MagicLinkAuthResponse>(apiUrl, { email, token, ...params })
}
