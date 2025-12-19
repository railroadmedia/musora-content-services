/**
 * @module Onboarding
 */
import { HttpClient, POST } from '../../infrastructure/http/HttpClient'
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
  recommendation?:
    | {
        accepted: true
        content_id: number
      }
    | { accepted: false }
}

export interface StartOnboardingParams {
  email: string
  brand: string
  flow: string
  marketingOptIn: boolean
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
  steps = {},
  marketingOptIn = false,
}: StartOnboardingParams): Promise<Onboarding> {
  return POST(`/api/user-management-system/v1/onboardings`, {
    email,
    brand,
    flow,
    steps,
    marketing_opt_in: marketingOptIn,
    is_completed: false,
  })
}

export interface UpdateOnboardingParams {
  id: number
  email: string
  brand: string
  flow: string
  marketingOptIn: boolean
  is_completed?: boolean
  steps: OnboardingSteps
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
  return httpClient.put<Onboarding>(`/api/user-management-system/v1/onboardings/${id}`, {
    email,
    brand,
    flow,
    steps,
    is_completed,
    marketing_opt_in: marketingOptIn,
  })
}

/**
 * Fetches the onboardings for the current user and specified brand.
 *
 * @param {string} brand - The brand identifier.
 *
 * @returns {Promise<Onboarding>} - A promise that resolves with the onboarding data.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function userOnboardingForBrand(brand: string): Promise<Onboarding> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<Onboarding>(
    `/api/user-management-system/v1/users/${globalConfig.sessionConfig.userId}/onboardings/brand/${encodeURIComponent(brand)}`
  )
}

export interface OnboardingRecommendedContent {
  id: number
  title: string
  difficulty: string
  lesson_count: number
  skill_count: number
  badge: string
  description: string
  video: {
    external_id: string
    hlsManifestUrl: string
    type: string
  }
}

export interface OnboardingRecommendationResponse {
  recommendation: OnboardingRecommendedContent
  user_onboarding: Onboarding
}

/**
 * Fetches recommended content for onboarding based on the specified brand.
 *
 * @param {number} onboardingId - The ID of the onboarding process.
 * @returns {Promise<OnboardingRecommendationResponse>} - A promise that resolves with the recommended content.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function getOnboardingRecommendedContent(
  onboardingId: number
): Promise<OnboardingRecommendationResponse> {
  return POST(`/api/user-management-system/v1/onboardings/${onboardingId}/recommendation`, {})
}
