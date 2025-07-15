/**
 * @module UserProfile
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'
import { calculateLongestStreaks } from '../userActivity.js'

const baseUrl = `/api/user-management-system`

type StreakDTO = {
  type: string
  length: number
  start_date?: Date | null
  end_date?: Date | null
}

type OtherStatsDTO = {
  longest_day_streak: StreakDTO
  longest_week_streak: StreakDTO
  total_practice_time: number
  comment_likes: number
  forum_post_likes: number
  experience_points: number
}

const defaultStats: OtherStatsDTO = {
  longest_day_streak: { type: 'day', length: 0 },
  longest_week_streak: { type: 'week', length: 0 },
  total_practice_time: 0,
  comment_likes: 0,
  forum_post_likes: 0,
  experience_points: 0,
}

const mergeStats = (
  stats: OtherStatsDTO,
  longestStreaks: { longestDailyStreak: any; longestWeeklyStreak: any; totalPracticeSeconds: any }
) =>
  ({
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
  }) as OtherStatsDTO

export async function otherStats(
  userId: string = globalConfig.sessionConfig.userId
): Promise<OtherStatsDTO | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const [otherStats, longestStreaks] = await Promise.all([
    httpClient.get<OtherStatsDTO>(`${baseUrl}/v1/users/${userId}/statistics`, 'get'),
    calculateLongestStreaks(userId),
  ])

  return otherStats.fold(
    (error) => {
      console.error('Failed to fetch other stats:', error)
      return mergeStats(defaultStats, longestStreaks)
    },
    (stats) => mergeStats(stats, longestStreaks)
  )
}
