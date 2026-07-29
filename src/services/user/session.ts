import { globalConfig } from '../config.js'
import { HttpClient } from '@/infrastructure/http'
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
  return httpClient.post(apiUrl, params)
}
