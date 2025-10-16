import SyncRepository, { Q } from './base'
import ContentProgress, { COLLECTION_TYPE } from '../models/ContentProgress'

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  // get all progress for a given brand, collection type and id
  async getAllProgress(
    { brand, collection }: { brand?: string; collection?: { type: COLLECTION_TYPE, id: number } | null },
    limit?: number
  ) {
    const clauses: Q.Clause[] = []
    if (brand) { clauses.push(Q.where('brand', brand)) }
    if (typeof collection != 'undefined') {
      clauses.push(...[
        Q.where('collection_type', collection?.type ?? null),
        Q.where('collection_id', collection?.id ?? null)
      ])
    }
    if (limit) { clauses.push(Q.take(limit)) }

    return await this.queryAll(...clauses)
  }

  // get one contentId of a given collection type and id
  async getOneProgressByContentId(
    contentId: number,
    { brand, collection }: { brand?: string; collection?: { type: COLLECTION_TYPE, id: number } | null }
  ) {
    const clauses = [
      Q.where('content_id', contentId)
    ]
    if (brand) { clauses.push(Q.where('brand', brand)) }
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
    { brand, collection }: { brand?: string; collection?: { type: COLLECTION_TYPE, id: number } | null }
  ) {
    const clauses = [
      Q.where('content_id', Q.oneOf(contentIds))
    ]
    if (brand) { clauses.push(Q.where('brand', brand)) }
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
