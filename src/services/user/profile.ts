/**
 * @module UserProfile
 */
import { globalConfig } from '../config.js'
import { GET, DELETE, HttpClient } from '../../infrastructure/http/HttpClient'
import { calculateLongestStreaks } from '../userActivity.js'
import { UserResource } from './account'

const baseUrl = `/api/user-management-system`

export interface StreakDTO {
  type: 'day' | 'week'
  length: number
  start_date?: Date | null
  end_date?: Date | null
}

export interface OtherStatsDTO {
  longest_day_streak: StreakDTO
  longest_week_streak: StreakDTO
  total_practice_time: number
  comment_likes: number
  forum_post_likes: number
  experience_points: number
}

interface UserStatisticsResponse {
  comment_likes: number
  forum_post_likes: number
  experience_points: number
  v1_practice_time?: number
  [key: string]: unknown
}

export async function otherStats(
  userId: number | null = globalConfig.sessionConfig.userId
): Promise<OtherStatsDTO> {
  const [stats, longestStreaks] = await Promise.all([
    GET<UserStatisticsResponse>(`${baseUrl}/v1/users/${userId}/statistics`),
    calculateLongestStreaks(userId),
  ])

  return {
    ...stats,
    longest_day_streak: {
      type: 'day',
      length: longestStreaks.longestDailyStreak,
    },
    longest_week_streak: {
      type: 'week',
      length: longestStreaks.longestWeeklyStreak,
    },
    total_practice_time: longestStreaks.totalPracticeSeconds + (stats.v1_practice_time ?? 0),
  } as OtherStatsDTO
}

export async function deleteProfilePicture(): Promise<void> {
  const url = `${baseUrl}/v1/users/profile_picture`
  await DELETE(url)
}

export async function updateProfileVisibility(isPublic: boolean): Promise<UserResource> {
  const apiUrl = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/profile-visibility`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post<UserResource>(apiUrl, { is_profile_public: isPublic })
}
