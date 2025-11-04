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

/**
 * Fetches recommended content for onboarding based on the specified brand.
 *
 * @param {string} brand - The brand identifier.
 * @returns {Promise<OnboardingRecommendedContent>} - A promise that resolves with the recommended content.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function getOnboardingRecommendedContent(
  brand: string
): Promise<OnboardingRecommendedContent> {
  // TODO: Replace with real API call when available
  return {
    id: 412405,
    title: 'Getting Started On The Piano',
    difficulty: 'Beginner',
    lesson_count: 4,
    skill_count: 3,
    badge:
      'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    description:
      'The goal of this course is to introduce you to the keys, and get you playing a song as fast as possible. ',
    video: {
      external_id: '1001267395',
      hlsManifestUrl:
        'https://player.vimeo.com/external/1001267395.m3u8?s=8f8d8a8a762f688058e6e6fd6704c402baf1b797&oauth2_token_id=1284792283',
      type: 'vimeo-video',
    },
  }
}
