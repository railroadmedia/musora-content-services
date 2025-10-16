/**
 * @module Onboarding
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'

export interface UpdateOnboardingAnswerProps {
  question: 'gear' | 'topic' | 'genre' | 'experience' | 'goals' | 'instrument' | 'coach'
  answer: string
  brand: string
}

/**
 * @param {UpdateOnboardingAnswerProps} props - The properties for updating an onboarding answer.
 * @property {string} props.question - The onboarding question identifier.
 * @property {string} props.answer - The answer to the onboarding question.
 *
 * @returns {Promise<void>} - A promise that resolves when the onboarding answer is updated.
 * @throws {HttpError} - Throws an HttpError if the request fails.
 */
export async function storeOnboardingAnswer({
  question,
  answer,
  brand,
}: UpdateOnboardingAnswerProps): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(`/api/user-management-system/v1/users/onboarding/${question}`, {
    answer,
    brand,
  })
}
