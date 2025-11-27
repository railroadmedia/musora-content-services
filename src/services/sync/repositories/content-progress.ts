import SyncRepository, { Q } from './base'
import ContentProgress, { COLLECTION_TYPE, STATE } from '../models/ContentProgress'

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  async startedIds(limit?: number) {
    return this.queryAll(
      Q.where('state', STATE.STARTED),
      Q.sortBy('updated_at', 'desc'),
      Q.take(limit || Infinity)
    )
  }

  async completedIds(limit?: number) {
    return this.queryAllIds(
      Q.where('state', STATE.COMPLETED),
      Q.sortBy('updated_at', 'desc'),
      Q.take(limit || Infinity)
    )
  }

  async startedOrCompleted(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAll(...this.startedOrCompletedClauses(opts))
  }

  async startedOrCompletedIds(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAllIds(...this.startedOrCompletedClauses(opts))
  }

  private startedOrCompletedClauses(
    opts: {
      brand?: string
      updatedAfter?: number
      limit?: number
    } = {}
  ) {
    const clauses: Q.Clause[] = [
      Q.or(Q.where('state', STATE.STARTED), Q.where('state', STATE.COMPLETED)),
      Q.sortBy('updated_at', 'desc'),
    ]

    if (opts.updatedAfter) {
      clauses.push(Q.where('updated_at', Q.gte(opts.updatedAfter)))
    }

    if (opts.brand) {
      clauses.push(Q.where('content_brand', opts.brand))
    }

    if (opts.limit) {
      clauses.push(Q.take(opts.limit))
    }

    return clauses
  }

  async mostRecentlyUpdatedId(contentIds: number[]) {
    return this.queryOneId(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.sortBy('updated_at', 'desc')
    )
  }

  async getOneProgressByContentId(
    contentId: number,
    { collection }: { collection?: { type: COLLECTION_TYPE; id: number } | null } = {}
  ) {
    const clauses = [Q.where('content_id', contentId)]
    if (typeof collection != 'undefined') {
      clauses.push(
        ...[
          Q.where('collection_type', collection?.type ?? null),
          Q.where('collection_id', collection?.id ?? null),
        ]
      )
    }

    return await this.queryOne(...clauses)
  }

  async getSomeProgressByContentIds(
    contentIds: number[],
    collection: { type: COLLECTION_TYPE; id: number } | null = null
  ) {
    const clauses = [Q.where('content_id', Q.oneOf(contentIds))]
    if (typeof collection != 'undefined') {
      clauses.push(
        ...[
          Q.where('collection_type', collection?.type ?? null),
          Q.where('collection_id', collection?.id ?? null),
        ]
      )
    }

    return await this.queryAll(...clauses)
  }

  recordProgressRemotely(contentId: number, progressPct: number, resumeTime?: number) {
    const id = ProgressRepository.generateId(contentId, null)
    const progressStatus = progressPct === 100 ? STATE.COMPLETED : STATE.STARTED

    const result = this.upsertOneRemote(id, (r) => {
      r.content_id = contentId
      r.state = progressStatus
      r.progress_percent = progressPct

      if (typeof resumeTime != 'undefined') {
        r.resume_time_seconds = Math.floor(resumeTime)
      }
    })

    // Emit event AFTER database write completes
    result.then(() => {
      return Promise.all([
        import('../../progress-events'),
        import('../../config')
      ])
    }).then(([progressEventsModule, { globalConfig }]) => {
      progressEventsModule.emitProgressSaved({
        userId: globalConfig.railcontentConfig?.userId || 0,
        contentId,
        progressPercent: progressPct,
        progressStatus,
        bubble: true,
        collectionType: null,
        collectionId: null,
        resumeTimeSeconds: resumeTime ?? null,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Failed to emit progress saved event:', error)
    })

    return result
  }

  recordProgressesTentative(contentProgresses: Map<number, number>) {
    return this.upsertSomeTentative(
      Object.fromEntries(
        Array.from(contentProgresses, ([contentId, progressPct]) => [
          ProgressRepository.generateId(contentId, null),
          (r) => {
            r.content_id = contentId
            r.state = progressPct === 100 ? STATE.COMPLETED : STATE.STARTED
            r.progress_percent = progressPct
          },
        ])
      )
    )
  }

  eraseProgress(contentId: number) {
    return this.deleteOne(ProgressRepository.generateId(contentId, null))
  }

  private static generateId(
    contentId: number,
    collection: { type: COLLECTION_TYPE; id: number } | null
  ) {
    if (collection) {
      return `${contentId}:${collection.type}:${collection.id}`
    } else {
      return `${contentId}`
    }
  }
}
