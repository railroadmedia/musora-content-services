import SyncRepository, { Q } from './base'
import ContentProgress, { COLLECTION_TYPE, STATE } from '../models/ContentProgress'

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  async startedIds(limit?: number) {
    return this.queryAllIds(
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

  private startedOrCompletedClauses(opts: {
    brand?: string;
    updatedAfter?: number;
  } = {}) {
    const clauses: Q.Clause[] = [
      Q.or(
        Q.where('state', STATE.STARTED),
        Q.where('state', STATE.COMPLETED)
      ),
      Q.sortBy('updated_at', 'desc')
    ]

    if (opts.updatedAfter) {
      clauses.push(Q.where('updated_at', Q.gte(opts.updatedAfter)))
    }

    if (opts.brand) {
      clauses.push(Q.where('brand', opts.brand))
    }

    return clauses
  }

  async mostRecentlyUpdatedId(contentIds: number[]) {
    return this.queryOneId(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.sortBy('updated_at', 'desc'),
    )
  }

  // get one contentId of a given collection type and id
  async getOneProgressByContentId(
    contentId: number,
    { collection }: { collection?: { type: COLLECTION_TYPE, id: number } | null } = {}
  ) {
    const clauses = [
      Q.where('content_id', contentId)
    ]
    if (typeof collection != 'undefined') {
      clauses.push(...[
        Q.where('collection_type', collection?.type ?? null),
        Q.where('collection_id', collection?.id ?? null)
      ])
    }

    return await this.queryOne(...clauses)
  }

  // get multiple contentIds of a given collection type and id
  async getSomeProgressByContentIds(
    contentIds: number[],
    { collection }: { collection?: { type: COLLECTION_TYPE, id: number } | null } = {}
  ) {
    const clauses = [
      Q.where('content_id', Q.oneOf(contentIds))
    ]
    if (typeof collection != 'undefined') {
      clauses.push(...[
        Q.where('collection_type', collection?.type ?? null),
        Q.where('collection_id', collection?.id ?? null)
      ])
    }

    return await this.queryAll(...clauses)
  }

  recordProgress(contentId: number, collection: { type: COLLECTION_TYPE, id: number } | null, attrs: { state: string, progressPercent: number }) {
    const id = ProgressRepository.generateId(contentId, collection)

    return this.upsertOne(id, r => {
      r.content_id = contentId
      r.collection_type = collection?.type ?? null
      r.collection_id = collection?.id ?? null
      r.state = attrs.state
      r.progress_percent = attrs.progressPercent
    })
  }

  private static generateId(contentId: number, collection: { type: COLLECTION_TYPE, id: number } | null) {
    if (collection) {
      return `${contentId}:${collection.type}:${collection.id}`
    } else {
      return `${contentId}`
    }
  }
}
