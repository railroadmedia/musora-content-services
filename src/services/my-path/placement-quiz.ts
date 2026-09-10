/**
 * @module MyPathPlacementQuiz
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { OnboardingRecommendedContent } from '@/services/user/onboarding'


const baseUrl = `/api/my-path/v1/placement-quiz`

interface PlacementQuizAnswers {
  skill_level: 'new' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  genres: string[]
  gear: string[]
}

interface PlacementQuizResponse {
  user_id: string
  brand: string
  answers: PlacementQuizAnswers
}

interface StorePlacementQuizResponse {
  placement_quiz: PlacementQuizResponse
  recommended_content: OnboardingRecommendedContent
  error?: any
}

/**
 * Fetches the placement quiz answers from the API.
 *
 * @param brand
 * @returns {Promise<PlacementQuizResponse>} - A promise that resolves to the placement quiz answers.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchQuizAnswers(brand: string): Promise<PlacementQuizResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<PlacementQuizResponse>(`${baseUrl}?brand=${brand}`)
}

/**
 * Stores the placement quiz answers to the API.
 *
 * @param brand
 * @param answers
 * @returns {Promise<PlacementQuizResponse>} - A promise that resolves to the stored placement quiz answers.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function storeQuizAnswers(brand: string, answers: PlacementQuizAnswers): Promise<StorePlacementQuizResponse> {
  const body = {
    brand,
    answers,
  }

  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<StorePlacementQuizResponse>(baseUrl, body)
}
