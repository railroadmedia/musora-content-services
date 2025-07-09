/**
 * @module Accounts
 */
import { HttpClient } from '../../infrastructure/http/HttpClient.js'
import { globalConfig } from '../config.js'

export async function status(email: string): Promise<{ requires_setup: boolean }> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${email}/status`
  )
  return response
}

export async function sendAccountSetupEmail(email: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(
    `/api/user-management-system/v1/accounts/${email}/send-setup-email`,
    {}
  )
}
