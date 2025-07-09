/**
 * @module Accounts
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'

export interface PasswordResetProps {
  email: string
  password: string
  passwordConfirmation: string
  token: string
}

export async function status(email: string): Promise<{ requires_setup: boolean } | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const response = await httpClient.get<{ requires_setup: boolean }>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
  return response
}

export async function sendAccountSetupEmail(email: string): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/send-setup-email`,
    {}
  )
}

export async function setupAccount({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/accounts`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
}

export async function sendPasswordResetEmail(email: string): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/accounts/password/reset-email`, {
    email,
  })
}

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
