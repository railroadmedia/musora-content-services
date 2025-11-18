import { Q } from '@nozbe/watermelondb'
import UserAwardProgress from '../models/UserAwardProgress'
import SyncRepository from './base'
import type { AwardDefinition, CompletionData } from '../../awards/types'

export default class UserAwardProgressRepository extends SyncRepository<UserAwardProgress> {

  /**
   * Get all awards
   */
  async getAll(options?: {
    limit?: number
    onlyCompleted?: boolean
  }) {
    const clauses = []

    if (options?.onlyCompleted) {
      clauses.push(Q.where('completed_at', Q.notEq(null)))
    }

    clauses.push(Q.sortBy('updated_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...clauses as any)
  }

  /**
   * Get completed awards
   */
  async getCompleted(limit?: number) {
    return this.getAll({ onlyCompleted: true, limit })
  }

  /**
   * Get in-progress awards
   */
  async getInProgress(limit?: number) {
    const clauses: any[] = [
      Q.where('progress_percentage', Q.gt(0)),
      Q.where('completed_at', Q.eq(null)),
      Q.sortBy('progress_percentage', Q.desc)
    ]

    if (limit) {
      clauses.push(Q.take(limit))
    }

    return this.queryAll(...clauses)
  }

  /**
   * Get award by award_id
   */
  async getByAwardId(awardId: string) {
    return this.readOne(awardId)
  }

  /**
   * Check if user has completed a specific award
   */
  async hasCompletedAward(awardId: string): Promise<boolean> {
    const result = await this.readOne(awardId)
    return result.data?.isCompleted ?? false
  }

  /**
   * Get awards completed recently (for activity feed)
   */
  async getRecentlyCompleted(options?: {
    limit?: number
    since?: number // Unix timestamp
  }) {
    const clauses: any[] = [
      Q.where('completed_at', Q.notEq(null))
    ]

    if (options?.since) {
      clauses.push(Q.where('completed_at', Q.gte(options.since)))
    }

    clauses.push(Q.sortBy('completed_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...clauses)
  }

  /**
   * Create or update award progress
   * Used when client detects award eligibility
   */
  async recordAwardProgress(
    awardId: string,
    progressPercentage: number,
    options?: {
      completedAt?: number | null
      progressData?: any
      completionData?: CompletionData | null
      immediate?: boolean // If true, push immediately
    }
  ) {
    const builder = (record: UserAwardProgress) => {
      record.award_id = awardId
      record.progress_percentage = progressPercentage

      if (options?.completedAt !== undefined) {
        record.completed_at = options.completedAt
      }

      if (options?.progressData !== undefined) {
        record.progress_data = options.progressData
      }

      if (options?.completionData !== undefined) {
        record.completion_data = options.completionData
      }
    }

    if (options?.immediate) {
      return this.upsertOneRemote(awardId, builder)
    } else {
      return this.upsertOne(awardId, builder)
    }
  }

  /**
   * Mark award as completed
   */
  async completeAward(
    awardId: string,
    completionData: CompletionData
  ) {
    return this.recordAwardProgress(awardId, 100, {
      completedAt: Math.floor(Date.now() / 1000),
      completionData,
      immediate: true // Push immediately for instant feedback
    })
  }

  /**
   * Get awards for a specific content ID
   * Cross-references with Sanity definitions
   */
  async getAwardsForContent(contentId: number): Promise<{
    definitions: AwardDefinition[]
    progress: Map<string, UserAwardProgress>
  }> {
    // Import dynamically to avoid circular dependencies
    const { awardDefinitions } = await import('../../awards/award-definitions')

    // Get award definitions for this content
    const definitions = await awardDefinitions.getByContentId(contentId)

    // Get user's progress for these awards
    const awardIds = definitions.map(d => d._id)
    const progressMap = new Map<string, UserAwardProgress>()

    for (const awardId of awardIds) {
      const result = await this.getByAwardId(awardId)
      if (result.data) {
        progressMap.set(awardId, result.data)
      }
    }

    return { definitions, progress: progressMap }
  }
}
