import { HttpClient } from '../../infrastructure/http/HttpClient'
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

export async function unlinkOAuthProvider(provider: OAuthProvider): Promise<void> {
  const userId = globalConfig.userId
  const apiUrl = `/api/user-management-system/v1/sessions/${encodeURIComponent(userId)}/oauth/${encodeURIComponent(provider)}`
  return new HttpClient(globalConfig.baseUrl).delete(apiUrl)
}
