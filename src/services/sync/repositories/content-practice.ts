import { Q } from '@nozbe/watermelondb'
import Practice from '../models/Practice'
import SyncRepository from './base'

export default class ContentPracticeRepository extends SyncRepository<Practice> {

  /**
   * Get total practice minutes for given content IDs
   * Used for award completion data calculation
   */
  async sumPracticeMinutesForContent(contentIds: number[]): Promise<number> {
    if (contentIds.length === 0) return 0

    const practices = await this.queryAll(
      Q.where('content_id', Q.oneOf(contentIds))
    )

    const totalSeconds = practices.data.reduce(
      (sum, practice) => sum + practice.duration_seconds,
      0
    )

    return Math.round(totalSeconds / 60)
  }

  /**
   * Get practice sessions for specific content
   */
  async getForContent(contentId: number) {
    return await this.queryAll(
      Q.where('content_id', contentId),
      Q.sortBy('created_at', Q.desc)
    )
  }

  /**
   * Get total practice time across all content
   */
  async getTotalPracticeMinutes(): Promise<number> {
    const practices = await this.queryAll()

    const totalSeconds = practices.data.reduce(
      (sum, practice) => sum + practice.duration_seconds,
      0
    )

    return Math.round(totalSeconds / 60)
  }
}
