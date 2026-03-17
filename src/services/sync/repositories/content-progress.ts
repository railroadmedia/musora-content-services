import SyncRepository, {Q} from './base'
import ContentProgress, {COLLECTION_ID_SELF, COLLECTION_TYPE, STATE, CollectionParameter} from '../models/ContentProgress'

interface MetadataParameter {
  brand: string
  type: string
  parent_id: number
}

export default class ProgressRepository extends SyncRepository<ContentProgress> {

  async started(
    limit?: number,
    opts: {
      onlyIds?: boolean
      include?: { aLaCarte?: boolean, learningPaths?: boolean }
    } = {}
    ) {
    const results = await this.queryAll(...[
      ProgressRepository.collectionTypeFilter(opts.include),

      Q.where('state', STATE.STARTED),
      Q.sortBy('updated_at', 'desc'),

      ...(limit ? [Q.take(limit)] : []),
    ])

    return opts.onlyIds
        ? results.data.map((r) => r.content_id)
        : results.data
  }

  async completed(
    limit?: number,
    opts: {
      onlyIds?: boolean
      include?: { aLaCarte?: boolean, learningPaths?: boolean }
    } = {}
  ) {
    const results = await this.queryAll(...[
      ProgressRepository.collectionTypeFilter(opts.include),

      Q.where('state', STATE.COMPLETED),
      Q.sortBy('updated_at', 'desc'),

      ...(limit ? [Q.take(limit)] : []),
    ])

    return opts.onlyIds
      ? results.data.map((r) => r.content_id)
      : results.data
  }

  //this _specifically_ needs to get content_ids from ALL collection_types (including self)
  async completedByContentIds(contentIds: number[]) {
    return this.queryAll(
      Q.where('content_id', Q.oneOf(contentIds)),
      Q.where('state', STATE.COMPLETED)
    )
  }

  async startedOrCompleted(opts: Parameters<typeof this.startedOrCompletedClauses>[0] = {}) {
    return this.queryAll(...this.startedOrCompletedClauses(opts))
  }

  private startedOrCompletedClauses(
    opts: {
      brand?: string | null
      contentTypes?: string[] | null
      parentId?: number | null
      include?: { aLaCarte?: boolean, learningPaths?: boolean }
      updatedAfter?: number
      limit?: number
    } = {}
  ) {
    const clauses: Q.Clause[] = [
      ProgressRepository.collectionTypeFilter(opts.include),

      Q.or(Q.where('state', STATE.STARTED), Q.where('state', STATE.COMPLETED)),
      Q.sortBy('updated_at', 'desc'),
    ]

    if (opts.updatedAfter) {
      clauses.push(Q.where('updated_at', Q.gte(opts.updatedAfter)))
    }

    if (opts.brand) {
      clauses.push(Q.where('content_brand', opts.brand))
    }

    if (opts.contentTypes) {
      clauses.push(Q.where('content_type', Q.oneOf(opts.contentTypes)))
    }

    if (opts.parentId || opts.parentId === 0) {
      clauses.push(Q.where('content_parent_id', opts.parentId))
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

  // utilize last_interacted_a_la_carte of the :self record, which is updated whenever the content is accessed
  // a-la-carte (not in LP), and compare this with updated_at (which will be greater than if it was last accessed from LP)
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

  async getSomeProgressByRecordIds(ids: string[]) {
    return await this.readSome(ids)
  }

  recordProgress(contentId: number, collection: CollectionParameter | null, progressPct: number, resumeTime?: number, {skipPush = false, accessedDirectly = true} = {}) {
    const id = ContentProgress.generateId(contentId, collection)

    if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
      accessedDirectly = false
    }

    const result = this.upsertOne(id, (r) => {
      r.content_id = contentId
      r.collection_type = collection?.type ?? COLLECTION_TYPE.SELF
      r.collection_id = collection?.id ?? COLLECTION_ID_SELF

      r.progress_percent = progressPct

      r.content_brand = metadata.brand
      r.content_type = metadata.type
      r.content_parent_id = metadata.parent_id

      if (typeof resumeTime != 'undefined') {
        if (resumeTime >= 10 || r.resume_time_seconds !== null) {
          r.resume_time_seconds = Math.floor(resumeTime)
        }
      }

      if (accessedDirectly && r.collection_type === COLLECTION_TYPE.SELF) {
        r.last_interacted_a_la_carte = r.updated_at
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
    metadata: Record<string, MetadataParameter>,
    { skipPush = false, accessedDirectly = true }: { skipPush?: boolean; accessedDirectly?: boolean } = {}
  ) {
    if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
      accessedDirectly = false
    }

    const data = Object.fromEntries(
      Object.entries(contentProgresses).map(([contentId, progressPct]) => [
        ContentProgress.generateId(+contentId, collection),
        (r: ContentProgress) => {
          r.content_id = +contentId
          r.collection_type = collection?.type ?? COLLECTION_TYPE.SELF
          r.collection_id = collection?.id ?? COLLECTION_ID_SELF

          r.progress_percent = progressPct

          r.content_brand = metadata[contentId].brand
          r.content_type = metadata[contentId].type
          r.content_parent_id = metadata[contentId].parent_id

          if (accessedDirectly && r.collection_type === COLLECTION_TYPE.SELF) {
            r.last_interacted_a_la_carte = r.updated_at
          }
        },
      ])
    )
    return this.upsertSome(data, { skipPush })

    //todo add event emitting for bulk updates?
  }

  eraseProgress(contentId: number, collection: CollectionParameter | null, {skipPush = false} = {}) {
    return this.deleteOne(ContentProgress.generateId(contentId, collection), { skipPush })
  }

  eraseProgressMany(contentIds: number[], collection: CollectionParameter | null, {skipPush = false} = {}) {
    const ids = contentIds.map((id) => ContentProgress.generateId(id, collection))
    return this.deleteSome(ids, { skipPush })
  }

  static collectionTypeFilter(
    params: {
      aLaCarte?: boolean;
      learningPaths?: boolean
    } = {}) {
    let clauses: Q.Where[] = []

    if (params.aLaCarte) {
      clauses.push(
        Q.and( // a-la-carte content that's been accessed directly
          Q.where('collection_type', COLLECTION_TYPE.SELF),
          Q.where('collection_id', COLLECTION_ID_SELF),
          Q.where('last_interacted_a_la_carte', Q.notEq(null)),
        ),
      )
    }

    if (params.learningPaths) {
      clauses.push(
        Q.and( // just parents
          Q.where('collection_type', COLLECTION_TYPE.LEARNING_PATH),
          Q.where('content_id', Q.eq(Q.column('collection_id')))
        )
      )
    }

    if (clauses.length === 0) return
    return Q.or(...clauses)
  }
}
