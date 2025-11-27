import SyncRepository, { Q } from './base'
import ContentProgress, { COLLECTION_TYPE, STATE } from '../models/ContentProgress'

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  // null collection only
  async startedIds(limit?: number) {
    return this.queryAll(
      Q.where('collection_type', null),
      Q.where('collection_id', null),

      Q.where('state', STATE.STARTED),
      Q.sortBy('updated_at', 'desc'),
      Q.take(limit || Infinity)
    )
  }

  // null collection only
  async completedIds(limit?: number) {
    return this.queryAllIds(
      Q.where('state', STATE.COMPLETED),
      Q.sortBy('updated_at', 'desc'),
      Q.take(limit || Infinity)
    )
  }

  // null collection only
  async startedOrCompleted(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAll(...this.startedOrCompletedClauses(opts))
  }

  // null collection only
  async startedOrCompletedIds(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAllIds(...this.startedOrCompletedClauses(opts))
  }

  // null collection only
  private startedOrCompletedClauses(
    opts: {
      brand?: string
      updatedAfter?: number
      limit?: number
    } = {}
  ) {
    const clauses: Q.Clause[] = [
      Q.where('collection_type', null),
      Q.where('collection_id', null),

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

  async mostRecentlyUpdatedId(contentIds: number[], collection: { type: COLLECTION_TYPE; id: number } | null = null) {
    return this.queryOneId(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('collection_type', collection?.type ?? null),
      Q.where('collection_id', collection?.id ?? null),

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

  recordProgressRemotely(contentId: number, collection: { type: COLLECTION_TYPE; id: number } | null, progressPct: number, resumeTime?: number) {
    const id = ProgressRepository.generateId(contentId, collection)

    return this.upsertOneRemote(id, (r) => {
      r.content_id = contentId
      r.collection_type = collection?.type ?? null
      r.collection_id = collection?.id ?? null

      r.state = progressPct === 100 ? STATE.COMPLETED : STATE.STARTED
      r.progress_percent = progressPct

      if (typeof resumeTime != 'undefined') {
        r.resume_time_seconds = Math.floor(resumeTime)
      }
    })
  }

  recordProgressesTentative(contentProgresses: Map<number, number>, collection: { type: COLLECTION_TYPE; id: number } | null) {
    return this.upsertSomeTentative(
      Object.fromEntries(
        Array.from(contentProgresses, ([contentId, progressPct]) => [
          ProgressRepository.generateId(contentId, null),
          (r) => {
            r.content_id = contentId
            r.collection_type = collection?.type ?? null
            r.collection_id = collection?.id ?? null

            r.state = progressPct === 100 ? STATE.COMPLETED : STATE.STARTED
            r.progress_percent = progressPct
          },
        ])
      )
    )
  }

  eraseProgress(contentId: number, collection: { type: COLLECTION_TYPE; id: number } | null) {
    return this.deleteOne(ProgressRepository.generateId(contentId, collection))
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
