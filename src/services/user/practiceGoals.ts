/**
 * @module PracticeGoals
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import type { PracticeGoals, UpdatePracticeGoalsData } from './types'

const baseUrl = '/api/user/practices/v1/goals'

/**
 * @returns {Promise<PracticeGoals>}
 * @throws {HttpError}
 */
export async function fetchPracticeGoals(): Promise<PracticeGoals> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get<PracticeGoals>(baseUrl)
}

/**
 * @param {UpdatePracticeGoalsData} data
 * @returns {Promise<PracticeGoals>}
 * @throws {HttpError}
 */
export async function updatePracticeGoals(data: UpdatePracticeGoalsData): Promise<PracticeGoals> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.patch<PracticeGoals>(baseUrl, data)
}
