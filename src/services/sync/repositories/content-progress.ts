import SyncRepository, {Q} from './base'
import ContentProgress, {COLLECTION_ID_SELF, COLLECTION_TYPE, STATE} from '../models/ContentProgress'
import {EpochMs} from "../index";

interface ContentIdCollectionTuple {
  contentId: number,
  collection: CollectionParameter | null,
}

export interface CollectionParameter {
  type: COLLECTION_TYPE,
  id: number,
}
export default class ProgressRepository extends SyncRepository<ContentProgress> {
  // null collection only
  async startedIds(limit?: number) {
    return this.queryAll(...[
      Q.where('collection_type', COLLECTION_TYPE.SELF),
      Q.where('collection_id', COLLECTION_ID_SELF),

      Q.where('state', STATE.STARTED),
      Q.sortBy('updated_at', 'desc'),

      ...(limit ? [Q.take(limit)] : []),
    ]).then((r) => r.data.map((r) => r.content_id))
  }

  // null collection only
  async completedIds(limit?: number) {
    return this.queryAll(...[
      Q.where('collection_type', COLLECTION_TYPE.SELF),
      Q.where('collection_id', COLLECTION_ID_SELF),

      Q.where('state', STATE.COMPLETED),
      Q.sortBy('updated_at', 'desc'),

      ...(limit ? [Q.take(limit)] : []),
    ]).then((r) => r.data.map((r) => r.content_id))
  }

  //this _specifically_ needs to get content_ids from ALL collection_types (including null)
  async completedByContentIds(contentIds: number[]) {
    return this.queryAll(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('state', STATE.COMPLETED)
    )
  }

  // null collection only
  async startedOrCompleted(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAll(...this.startedOrCompletedClauses(opts))
  }

  // null collection only
  private startedOrCompletedClauses(
    opts: {
      brand?: string | null
      updatedAfter?: number,
      limit?: number,
    } = {}
  ) {
    const clauses: Q.Clause[] = [
      Q.where('collection_type', COLLECTION_TYPE.SELF),
      Q.where('collection_id', COLLECTION_ID_SELF),

      Q.where('last_interacted_a_la_carte', Q.notEq(null)),

      Q.or(Q.where('state', STATE.STARTED), Q.where('state', STATE.COMPLETED)),
      Q.sortBy('updated_at', 'desc'),
    ]

    if (opts.updatedAfter) {
      clauses.push(Q.where('updated_at', Q.gte(opts.updatedAfter)))
    }

    if (typeof opts.brand != 'undefined') {
      clauses.push(Q.where('content_brand', opts.brand))
    }

    if (opts.limit) {
      clauses.push(Q.take(opts.limit))
    }

    return clauses
  }

  async mostRecentlyUpdatedId(contentIds: number[], collection: CollectionParameter | null = null) {
    return this.queryOneId(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('collection_type', collection?.type ?? COLLECTION_TYPE.SELF),
      Q.where('collection_id', collection?.id ?? COLLECTION_ID_SELF),

      Q.sortBy('updated_at', 'desc')
    )
  }

  async getOneProgressByContentId(
    contentId: number,
    collection: CollectionParameter | null = null
  ) {
    const clauses = [
      Q.where('content_id', contentId),
      Q.where('collection_type', collection?.type ?? COLLECTION_TYPE.SELF),
      Q.where('collection_id', collection?.id ?? COLLECTION_ID_SELF),
    ]

    return await this.queryOne(...clauses)
  }

  async getSomeProgressByContentIds(
    contentIds: number[],
    collection: CollectionParameter | null = null
  ) {
    const clauses = [
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('collection_type', collection?.type ?? COLLECTION_TYPE.SELF),
      Q.where('collection_id', collection?.id ?? COLLECTION_ID_SELF),
    ]

    return await this.queryAll(...clauses)
  }

  // Two ways of checking this for a given content_id:
  //   * grab both records (collection_type = self & and collection_type = learning-path-v2), and compare their updated_at timestamps.
  //   * utilize the new last_interacted_a_la_carte, which is updated whenever the content is accessed OUTSIDE of an LP,  and compare THIS with the self updated_at (which will be greater than if it was last accessed from LP)
  // I went with the second because it's an easier query
  async getSomeProgressWhereLastAccessedFromMethod(contentIds: number[]) {
    const clauses = [
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('collection_type', COLLECTION_TYPE.SELF),
      Q.where('collection_id', COLLECTION_ID_SELF),
      Q.or(
          Q.and(
              Q.where('updated_at', Q.notEq(null)),
              Q.where('last_interacted_a_la_carte', null)
          ),
          Q.and(
              Q.where('updated_at', Q.notEq(null)),
              Q.where('last_interacted_a_la_carte', Q.notEq(null)),
              Q.where('updated_at', Q.gt(Q.column('last_interacted_a_la_carte')))
          )
      )
    ]

    return await this.queryAll(...clauses)
  }

  async getSomeProgressByContentIdsAndCollections(tuples: ContentIdCollectionTuple[]) {
    const clauses = []

    clauses.push(...tuples.map(tuple => Q.and(...tupleClauses(tuple))))

    return await this.queryAll(Q.or(...clauses))

    function tupleClauses(tuple: ContentIdCollectionTuple) {
      return [
        Q.where('content_id', tuple.contentId),
        Q.where('collection_type', tuple.collection?.type ?? COLLECTION_TYPE.SELF),
        Q.where('collection_id', tuple.collection?.id ?? COLLECTION_ID_SELF)
      ]
    }
  }

  recordProgress(contentId: number, collection: CollectionParameter | null, progressPct: number, resumeTime?: number, {skipPush = false, fromLearningPath = false} = {}) {
    const id = ProgressRepository.generateId(contentId, collection)

    if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
      fromLearningPath = true
    }

    const result = this.upsertOne(id, (r) => {
      r.content_id = contentId
      r.collection_type = collection?.type ?? COLLECTION_TYPE.SELF
      r.collection_id = collection?.id ?? COLLECTION_ID_SELF

      r.progress_percent = progressPct

      if (typeof resumeTime != 'undefined') {
        r.resume_time_seconds = Math.floor(resumeTime)
      }

      if (!fromLearningPath) {
        r.last_interacted_a_la_carte = Date.now() as EpochMs
      }

    }, { skipPush })

    // Emit event AFTER database write completes
    result.then(() => {
      return Promise.all([
        import('../../progress-events'),
        import('../../config')
      ])
    }).then(([progressEventsModule, { globalConfig }]) => {
      progressEventsModule.emitProgressSaved({
        userId: Number(globalConfig.railcontentConfig?.userId) || 0,
        contentId,
        progressPercent: progressPct,
        progressStatus: progressPct === 100 ? STATE.COMPLETED : STATE.STARTED,
        bubble: true,
        collectionType: collection?.type ?? COLLECTION_TYPE.SELF,
        collectionId: collection?.id ?? COLLECTION_ID_SELF,
        resumeTimeSeconds: resumeTime ?? null,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Failed to emit progress saved event:', error)
    })

    return result
  }

  recordProgressMany(
    contentProgresses: Record<string, number>, // Accept plain object
    collection: CollectionParameter | null,
    { skipPush = false, fromLearningPath = false }: { skipPush?: boolean; fromLearningPath?: boolean } = {}
  ) {
    if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
      fromLearningPath = true
    }

    const data = Object.fromEntries(
      Object.entries(contentProgresses).map(([contentId, progressPct]) => [
        ProgressRepository.generateId(+contentId, collection),
        (r: ContentProgress) => {
          r.content_id = +contentId
          r.collection_type = collection?.type ?? COLLECTION_TYPE.SELF
          r.collection_id = collection?.id ?? COLLECTION_ID_SELF

          r.progress_percent = progressPct

          if (!fromLearningPath) {
            r.last_interacted_a_la_carte = Date.now() as EpochMs
          }
        },
      ])
    )
    return this.upsertSome(data, { skipPush })

    //todo add event emitting for bulk updates?
  }

  eraseProgress(contentId: number, collection: CollectionParameter | null, {skipPush = false} = {}) {
    return this.deleteOne(ProgressRepository.generateId(contentId, collection), { skipPush })
  }

  eraseProgressMany(contentIds: number[], collection: CollectionParameter | null, {skipPush = false} = {}) {
    const ids = contentIds.map((id) => ProgressRepository.generateId(id, collection))
    return this.deleteSome(ids, { skipPush })
  }

  private static generateId(
    contentId: number,
    collection: CollectionParameter | null
  ) {
    return `${contentId}:${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
  }
}
