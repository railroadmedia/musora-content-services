/**
 * @module Onboarding
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { Brand } from '../../lib/brands'
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
}: StartOnboardingParams): Promise<Either<HttpError, Onboarding>> {
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
}: UpdateOnboardingParams): Promise<Either<HttpError, Onboarding>> {
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
export async function userOnboardingForBrand(
  brand: string
): Promise<Either<HttpError, Onboarding>> {
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

const recommendedContentCache: { [brand: string]: OnboardingRecommendedContent } = {
  drumeo: {
    id: 415737,
    title: 'The Power Of Your Left Hand (Beginner)',
    difficulty: 'Beginner',
    lesson_count: 12,
    skill_count: 1,
    badge:
      'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    description:
      'Start your drumming journey with essential techniques and rhythms to get you playing quickly.',
    video: {
      external_id: '1002267396',
      hlsManifestUrl:
        'https://player.vimeo.com/external/250467786.m3u8?s=52dc97fc96fe903d80bf71bc1b1709cc444db407&oauth2_token_id=1284792283',
      type: 'vimeo-video',
    },
  },
  pianote: {
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
  },
  guitareo: {
    id: 191346,
    title: 'Understanding Your Instrument',
    difficulty: 'Beginner',
    lesson_count: 6,
    skill_count: 5,
    badge:
      'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    description:
      'New to the acoustic guitar? Then this Course is for you! Learn everything you need to get started on the acoustic guitar, and start playing music as fast as possible!',
    video: {
      external_id: '1003267397',
      hlsManifestUrl:
        'https://player.vimeo.com/external/166972298.m3u8?s=a93bfe96a4ce9ac5a4eba3441838847ef2eafc9b&oauth2_token_id=1284792283',
      type: 'vimeo-video',
    },
  },
  singeo: {
    id: 415737,
    title: 'Sound Like A Star — Mastering Iconic Pop Voices',
    difficulty: 'Beginner',
    lesson_count: 5,
    skill_count: 4,
    badge:
      'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    description:
      'Welcome to the Singing Starter Kit! This course will teach you everything you need to know to sound better when you sing! You will learn how your unique voice works so that you can develop vocal strength, accurate pitch, and find confidence singing your favorite songs. You can sing, and the Singing Starter Kit is the perfect way to start your singing journey.',
    video: {
      external_id: '1004267398',
      hlsManifestUrl:
        'https://player.vimeo.com/external/1040159819.m3u8?s=f238ad1a650fb30a49c36d61996c982f06ffffb1&oauth2_token_id=1284792283',
      type: 'vimeo-video',
    },
  },
  playbass: {
    id: 191346,
    title: 'Understanding Your Instrument',
    difficulty: 'Beginner',
    lesson_count: 6,
    skill_count: 5,
    badge:
      'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    description:
      'New to the acoustic guitar? Then this Course is for you! Learn everything you need to get started on the acoustic guitar, and start playing music as fast as possible!',
    video: {
      external_id: '1003267397',
      hlsManifestUrl:
        'https://player.vimeo.com/external/166972298.m3u8?s=a93bfe96a4ce9ac5a4eba3441838847ef2eafc9b&oauth2_token_id=1284792283',
      type: 'vimeo-video',
    },
  },
}

/**
 * Fetches recommended content for onboarding based on the specified brand.
 *
 * @param {string} email - The user's email address.
 * @param {Brands} brand - The brand identifier.
 * @returns {Promise<OnboardingRecommendedContent>} - A promise that resolves with the recommended content.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function getOnboardingRecommendedContent(
  email: string,
  brand: Brand
): Promise<Either<HttpError, OnboardingRecommendedContent>> {
  // TODO: Replace with real API call when available
  if (recommendedContentCache[brand]) {
    return Either.right(recommendedContentCache[brand])
  }

  return Either.right({
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
  })
}
