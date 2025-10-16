/**
 * @module Onboarding
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'

export interface OnboardingProps {
  email: string
  brand: string
  flow: string
  steps: object
  isCompleted: boolean
}

/**
 * @param {Object} params - The parameters for starting the onboarding process.
 * @property {string} email - The email address for the account.
 * @property {string} brand - The brand associated with the account.
 * @property {string} flow - The onboarding flow identifier.
 * @property {object} steps - An object representing the steps completed in the onboarding process.
 * @property {boolean} isCompleted - A boolean indicating whether the onboarding process is completed.
 *
 * @returns {Promise<void>} - A promise that resolves when the onboarding process is started.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function startOnboarding({
  email,
  brand,
  flow,
  steps,
  isCompleted,
}: OnboardingProps): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/onboardings`, {
    email,
    brand,
    flow,
    steps,
    is_completed: isCompleted,
  })
}
