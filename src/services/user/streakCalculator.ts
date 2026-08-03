import dayjs from 'dayjs'
import { db } from '../sync'
import { getStreaksAndMessage } from '../../services/userActivity.js'

export interface StreakData {
  currentDailyStreak: number
  currentWeeklyStreak: number
  streakMessage: string
  calculatedAt: number // timestamp
  lastPracticeDate: string | null
  currentWeekPracticeDays: number
  todaysPracticeSeconds: number
}
export interface PracticeData {
  [date: string]: Array<{
    id: string | number
    duration_seconds: number
  }>
}
class StreakCalculator {
  private cache: StreakData | null = null
  async getStreakData(): Promise<StreakData> {
    if (this.cache) {
      return this.cache
    }

    return await this.recalculate()
  }

  async recalculate(): Promise<StreakData> {
    const allPractices = await this.fetchAllPractices()

    const { currentDailyStreak, currentWeeklyStreak, streakMessage, currentWeekPracticeDays } =
      getStreaksAndMessage(allPractices)

    this.cache = {
      currentDailyStreak: currentDailyStreak,
      currentWeeklyStreak: currentWeeklyStreak,
      streakMessage: streakMessage,
      calculatedAt: Date.now(),
      lastPracticeDate: this.getLastPracticeDate(allPractices),
      currentWeekPracticeDays: currentWeekPracticeDays,
      todaysPracticeSeconds: this.getTodaysPracticeSeconds(allPractices),
    }
    return this.cache
  }
  invalidate(): void {
    this.cache = null
  }

  private async fetchAllPractices(): Promise<PracticeData> {
    const query = await db.practices.getAll()

    return query.data.reduce((acc, practice) => {
      acc[practice.date] = acc[practice.date] || []
      acc[practice.date].push({
        id: practice.id,
        duration_seconds: practice.duration_seconds,
      })
      return acc
    }, {} as PracticeData)
  }

  private getLastPracticeDate(practices: PracticeData): string | null {
    const dates = Object.keys(practices).sort()
    return dates.length > 0 ? dates[dates.length - 1] : null
  }

  private getTodaysPracticeSeconds(practices: PracticeData): number {
    const today = dayjs().format('YYYY-MM-DD')
    return (practices[today] || []).reduce((total, practice) => total + practice.duration_seconds, 0)
  }
}



export const streakCalculator = new StreakCalculator()
