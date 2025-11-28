/**
 * @module UserProfile
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'
import { calculateLongestStreaks } from '../userActivity.js'

const baseUrl = `/api/user-management-system`

interface StreakDTO {
  type: string
  length: number
  start_date?: Date | null
  end_date?: Date | null
}

interface OtherStatsDTO {
  longest_day_streak: StreakDTO
  longest_week_streak: StreakDTO
  total_practice_time: number
  comment_likes: number
  forum_post_likes: number
  experience_points: number
}

interface LongestStreaksData {
  longestDailyStreak: number
  longestWeeklyStreak: number
  totalPracticeSeconds: number
}

const defaultStats: OtherStatsDTO = {
  longest_day_streak: { type: 'day', length: 0 },
  longest_week_streak: { type: 'week', length: 0 },
  total_practice_time: 0,
  comment_likes: 0,
  forum_post_likes: 0,
  experience_points: 0,
}

const mergeStats =
  (longestStreaks: LongestStreaksData) =>
  (stats: OtherStatsDTO): OtherStatsDTO => ({
    ...stats,
    longest_day_streak: {
      type: 'day',
      length: longestStreaks.longestDailyStreak,
    },
    longest_week_streak: {
      type: 'week',
      length: longestStreaks.longestWeeklyStreak,
    },
    total_practice_time: longestStreaks.totalPracticeSeconds,
  })

export async function otherStats(
  userId: string = globalConfig.sessionConfig.userId
): Promise<OtherStatsDTO> {
  const [otherStats, longestStreaks] = await Promise.all([
    HttpClient.client().get<OtherStatsDTO>(`${baseUrl}/v1/users/${userId}/statistics`, 'get'),
    calculateLongestStreaks(userId),
  ])

  return otherStats
    .ltap((e) => console.error('Error fetching other stats: ', e.statusText))
    .map(mergeStats(longestStreaks))
    .recover(mergeStats(longestStreaks)(defaultStats))
}

export const deleteProfilePicture = async (): Promise<Either<HttpError, void>> =>
  HttpClient.client()
    .delete<void>(`${baseUrl}/v1/users/profile_picture`)
    .then((res) => {
      return res.ltap((error) => console.error('Error deleting profile picture:', error.statusText))
    })
