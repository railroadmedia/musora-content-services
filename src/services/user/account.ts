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
  return httpClient
    .get<{
      requires_setup: boolean
    }>(`/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`)
    .then((r) =>
      r.fold(
        (error) => error,
        (data) => data
      )
    )
}

export async function sendAccountSetupEmail(email: string): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient
    .post<void>(
      `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/send-setup-email`,
      {}
    )
    .then((r) =>
      r.fold(
        (error) => error,
        (data) => data
      )
    )
}

export async function setupAccount({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient
    .post(`/api/user-management-system/v1/accounts`, {
      email,
      password,
      password_confirmation: passwordConfirmation,
      token,
    })
    .then((r) =>
      r.fold(
        (error) => error,
        (_data) => {
          return
        }
      )
    )
}

export async function sendPasswordResetEmail(email: string): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient
    .post(`/api/user-management-system/v1/accounts/password/reset-email`, {
      email,
    })
    .then((r) =>
      r.fold(
        (error) => error,
        (_data) => {
          return
        }
      )
    )
}

export async function resetPassword({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<void | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient
    .post(`/api/user-management-system/v1/accounts/password/reset`, {
      email,
      password,
      password_confirmation: passwordConfirmation,
      token,
    })
    .then((r) =>
      r.fold(
        (error) => error,
        (_data) => {
          return
        }
      )
    )
}
