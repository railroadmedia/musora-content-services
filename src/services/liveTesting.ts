import { Either } from '../core/types/ads/either'
import { HttpClient } from '../infrastructure/http/HttpClient'
import { HttpError } from '../infrastructure/http/interfaces/HttpError'
import { globalConfig } from './config.js'

export interface CreateTestUserProps {
  email?: string
  productId?: number
  createdAt?: Date
}

/**
 * @interface TestUser - Represents a test user object.
 * @property {User} user - The user object containing user details.
 * @property {string} brand - The brand associated with the test user.
 * @property {string} verificationToken - The verification token for the test user.
 */
export interface TestUser {
  user: object
  brand: string
  verificationToken: string
}

/**
 * @param {CreateTestUserProps} props - The parameters for creating a test user.
 * @property {number} [productId] - The product ID to associate with the test user.
 * @property {Date} [createdAt] - The creation date for the test user.
 */
export function createTestUser(props: CreateTestUserProps): Promise<Either<HttpError, void>> {
  return HttpClient.client().post<void>(`/api/testing/users`, props)
}
