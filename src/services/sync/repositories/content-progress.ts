import SyncRepository from "./base";
import ContentProgress from "../models/ContentProgress";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))
interface ProgressWriteDTO {
  contentId: number,
  state: string,
  progressPercent: number,
  collectionType: COLLECTION_TYPE,
  collectionId: number
}

enum COLLECTION_TYPE {
  DEFAULT = "none", // for creation of record id, we cannot use null
  LEARNING_PATH = "learning-path",
}

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  async queryWhere(clauses: Record<string, any>[], limit: number = null) {
    return await this.readAllWhere(clauses, limit)
  }

// get all progress for a given brand, collection type and id
  async getAllProgress(
      {
        brand = null,
        collectionType = COLLECTION_TYPE.DEFAULT,
        collectionId = 0
      }: {brand: string, collectionType: COLLECTION_TYPE, collectionId: number},
      limit: number = null) {
    let clauses = [];
    if (brand) clauses.push({brand: brand});
    if (collectionType) clauses.push({collection_type: collectionType});
    if (collectionId != 0) clauses.push({collection_id: collectionId});

    return await this.readAllWhere(clauses, limit)
  }

  // get one contentId of a given collection type and id
  async getOneProgressByContentId(
      {
        contentId,
        collectionType = COLLECTION_TYPE.DEFAULT,
        collectionId = 0
      }: {contentId: number, collectionType: COLLECTION_TYPE, collectionId: number}
  ) {
    return await this.readOne(ProgressRepository.generateId(contentId, collectionType, collectionId))
  }

  // get multiple contentIds of a given collection type and id
  async getSomeProgressByContentIds(
      {
        contentIds,
        collectionType = COLLECTION_TYPE.DEFAULT,
        collectionId = 0
      }: {contentIds: number[], collectionType: COLLECTION_TYPE, collectionId: number}) {
    let clauses = [];
    clauses.push({content_id: contentIds});
    if (collectionType) clauses.push({collection_type: collectionType});
    if (collectionId != 0) clauses.push({collection_id: collectionId});

    return await this.readAllWhere(clauses)
  }

  async writeProgress({
                        contentId,
                        state,
                        progressPercent,
                        collectionType = COLLECTION_TYPE.DEFAULT,
                        collectionId = 0,
                      }: ProgressWriteDTO) {
    const progress = await this.store.upsertOne(ProgressRepository.generateId(contentId, collectionType, collectionId), r => {
      r.content_id = contentId;
      r.state = state;
      r.progress_percent = progressPercent;
      r.collection_type = collectionType;
      r.collection_id = collectionId;
    })
    return await this.pushOneEagerlyById(progress.id)
  }

  private static generateId(contentId: number, collectionType: string, collectionId: number) {
    return contentId.toString() + ":" + collectionType + ":" + collectionId.toString();
  }
}
