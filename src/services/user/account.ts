/**
 * @module Accounts
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'

export interface PasswordResetProps {
  email: string
  password: string
  passwordConfirmation: string
  token: string
}

export interface AccountStatus {
  requires_setup: boolean
}

export const status = async (email: string): Promise<Either<HttpError, AccountStatus>> =>
  HttpClient.client().get<AccountStatus>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/status`
  )

export const sendAccountSetupEmail = async (email: string): Promise<Either<HttpError, void>> =>
  HttpClient.client().post<void>(
    `/api/user-management-system/v1/accounts/${encodeURIComponent(email)}/send-setup-email`,
    {}
  )

export const setupAccount = async ({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<Either<HttpError, void>> =>
  HttpClient.client().post<void>(`/api/user-management-system/v1/accounts`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })

export const sendPasswordResetEmail = async (email: string): Promise<Either<HttpError, void>> =>
  HttpClient.client().post<void>(`/api/user-management-system/v1/accounts/password/reset-email`, {
    email,
  })

export const resetPassword = async ({
  email,
  password,
  passwordConfirmation,
  token,
}: PasswordResetProps): Promise<Either<HttpError, void>> =>
  HttpClient.client().post<void>(`/api/user-management-system/v1/accounts/password/reset`, {
    email,
    password,
    password_confirmation: passwordConfirmation,
    token,
  })
