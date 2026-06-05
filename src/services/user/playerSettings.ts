/**
 * @module PlayerSettings
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import type { PlayerSettings, UpdatePlayerSettingsData } from './types'

const baseUrl = '/api/user-management-system/v1/user/player-settings'

/**
 * @returns {Promise<PlayerSettings>}
 * @throws {HttpError}
 */
export async function fetchPlayerSettings(): Promise<PlayerSettings> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get<PlayerSettings>(baseUrl)
}

/**
 * @param {UpdatePlayerSettingsData} data
 * @returns {Promise<PlayerSettings>}
 * @throws {HttpError}
 */
export async function updatePlayerSettings(data: UpdatePlayerSettingsData): Promise<PlayerSettings> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.put<PlayerSettings>(baseUrl, data)
}
