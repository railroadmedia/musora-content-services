import { Q } from '@nozbe/watermelondb'
import UserAwardProgress from '../models/UserAwardProgress'
import SyncRepository from './base'
import type { AwardDefinition, CompletionData } from '../../awards/internal/types'
import type { ModelSerialized } from '../serializers'

export default class UserAwardProgressRepository extends SyncRepository<UserAwardProgress> {
  async getAll(options?: { limit?: number; onlyCompleted?: boolean }) {
    const clauses = []

    if (options?.onlyCompleted) {
      clauses.push(Q.where('completed_at', Q.notEq(null)))
    }

    clauses.push(Q.sortBy('updated_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...(clauses as any))
  }

  async getCompleted(limit?: number) {
    return this.getAll({ onlyCompleted: true, limit })
  }

  async getInProgress(limit?: number) {
    const clauses: any[] = [
      Q.where('progress_percentage', Q.gt(0)),
      Q.where('completed_at', Q.eq(null)),
      Q.sortBy('progress_percentage', Q.desc),
    ]

    if (limit) {
      clauses.push(Q.take(limit))
    }

    return this.queryAll(...clauses)
  }

  async getByAwardId(awardId: string) {
    return this.readOne(awardId)
  }

  async hasCompletedAward(awardId: string): Promise<boolean> {
    const result = await this.readOne(awardId)
    return result.data?.isCompleted ?? false
  }

  async getRecentlyCompleted(options?: { limit?: number; since?: number }) {
    const clauses: any[] = [Q.where('completed_at', Q.notEq(null))]

    if (options?.since) {
      clauses.push(Q.where('completed_at', Q.gte(options.since)))
    }

    clauses.push(Q.sortBy('completed_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...clauses)
  }

  async recordAwardProgress(
    awardId: string,
    progressPercentage: number,
    options?: {
      completedAt?: number | null
      progressData?: any
      completionData?: CompletionData | null
      immediate?: boolean
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

    return this.upsertOne(awardId, builder)
  }

  async completeAward(awardId: string, completionData: CompletionData) {
    return this.recordAwardProgress(awardId, 100, {
      completedAt: Math.floor(Date.now() / 1000),
      completionData,
      immediate: true,
    })
  }

  async getAwardsForContent(contentId: number): Promise<{
    definitions: AwardDefinition[]
    progress: Map<string, ModelSerialized<UserAwardProgress>>
  }> {
    const { awardDefinitions } = await import('../../awards/internal/award-definitions')

    const definitions = await awardDefinitions.getByContentId(contentId)

    const awardIds = definitions.map((d) => d._id)
    const progressMap = new Map<string, ModelSerialized<UserAwardProgress>>()

    for (const awardId of awardIds) {
      const result = await this.getByAwardId(awardId)
      if (result.data) {
        progressMap.set(awardId, result.data)
      }
    }

    return { definitions, progress: progressMap }
  }
}
