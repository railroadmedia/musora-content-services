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

export async function status(email: string): Promise<Either<HttpError, AccountStatus>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<AccountStatus>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )
}

export async function sendAccountSetupEmail(email: string): Promise<Either<HttpError, void>> {
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
}: PasswordResetProps): Promise<Either<HttpError, void>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`/api/user-management-system/v1/accounts`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
}

export async function sendPasswordResetEmail(email: string): Promise<Either<HttpError, void>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`/api/user-management-system/v1/accounts/password/reset-email`, {
    email,
  })
}

export async function resetPassword({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<Either<HttpError, void>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`/api/user-management-system/v1/accounts/password/reset`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
}
