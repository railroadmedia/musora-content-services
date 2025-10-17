/**
 * @module Onboarding
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'

export interface OnboardingSteps {
  email?: string
  instrument?: 'drums' | 'guitar' | 'piano' | 'voice' | 'bass'
  skill_level?: 'new' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  topics?: string[]
  gear?: string[]
  genres?: string[]
  goals?: string[]
  practice_frequency?: string
  enable_notifications?: boolean
}

export interface StartOnboardingParams {
  email: string
  brand: string
  flow: string
  marketingOptIn: boolean
  steps?: OnboardingSteps
}

export interface UpdateOnboardingParams {
  id: number
  email: string
  brand: string
  flow: string
  marketingOptIn: boolean
  is_completed?: boolean
  steps?: OnboardingSteps
}

export interface Onboarding {
  id: number
  email: string
  brand: string
  flow: string
  steps: OnboardingSteps
  is_completed: boolean
  completed_at: Date | null
  marketing_opt_in: boolean
}

/**
 * @param {StartOnboardingParams} params - The parameters for starting the onboarding process.
 *
 * @returns {Promise<Onboarding>} - A promise that resolves when the onboarding process is started.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function startOnboarding({
  email,
  brand,
  flow,
  steps,
  marketingOptIn = false,
}: StartOnboardingParams): Promise<Onboarding> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<Onboarding>(`/api/user-management-system/v1/onboardings`, {
    email,
    brand,
    flow,
    steps,
    marketing_opt_in: marketingOptIn,
    is_completed: false,
  })
}

/**
 * @param {UpdateOnboardingParams} params - The parameters for updating the onboarding process.
 *
 * @returns {Promise<Onboarding>} - A promise that resolves when the onboarding process is updated.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function updateOnboarding({
  id,
  email,
  brand,
  flow,
  steps,
  is_completed = false,
  marketingOptIn = false,
}: UpdateOnboardingParams): Promise<Onboarding> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<Onboarding>(`/api/user-management-system/v1/onboardings/${id}`, {
    email,
    brand,
    flow,
    steps,
    is_completed,
    marketing_opt_in: marketingOptIn,
  })
}
