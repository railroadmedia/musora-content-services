import SyncRepository from "./base";
import ContentProgress from "../models/ContentProgress";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))
interface ProgressWriteDTO {
  contentId: number,
  state: string,
  progressPercent: number,
  parentType?: number,
  parentId?: number
}

enum PARENT_TYPE {
  DEFAULT = 0,
  LEARNING_PATH = 1,
}

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  async queryWhere(clauses: Record<string, any>[], limit: number = null) {
    return await this.queryBy(clauses, limit)
  }

  // all records: all parents null
  // method records: parentType = 1, parentId = null
  // LP records: parentType = 1, parentId = LP_id
  async getAllProgress(
      {
        brand = null,
        parentType = null,
        parentId = null
      }: {brand: string, parentType: number, parentId: number},
      limit: number = null) {
    let clauses = [];
    if (brand) clauses.push({brand: brand});
    if (parentType) clauses.push({parent_type: parentType});
    if (parentId) clauses.push({parent_id: parentId});

    return await this.queryBy(clauses, limit)
  }

  // does not allow retrieval of content_id and all its parent types
  async getProgressByContentId(
      {
        contentId,
        parentType = null,
        parentId = null
      }: {contentId: number, parentType: number, parentId: number}
  ) {
    const parentTypeVal = parentType ? parentType : PARENT_TYPE.DEFAULT;
    const parentIdVal = parentId ? parentId : null;

    return await this.readOne(ProgressRepository.generateId(contentId, parentTypeVal, parentIdVal))
  }

  async getProgressByContentIds(
      {
        contentIds,
        parentType = null,
        parentId = null
      }: {contentIds: number[], parentType: number, parentId: number}) {
    let clauses = [];
    clauses.push({content_id: contentIds});
    if (parentType) clauses.push({parent_type: parentType});
    if (parentId) clauses.push({parent_id: parentId});

    return await this.queryBy(clauses)
  }

  async writeProgress({
                        contentId,
                        state,
                        progressPercent,
                        parentType = PARENT_TYPE.DEFAULT,
                        parentId = null,
                      }: ProgressWriteDTO) {
    return await this.store.upsertOne(ProgressRepository.generateId(contentId, parentType, parentId), r => {
      r.content_id = contentId;
      r.state = state;
      r.progress_percent = progressPercent;
      r.parent_type = parentType;
      r.parent_id = parentId;
    })
  }

  private static generateId(contentId: number, parentType: number, parentId: number) {
    const parent = parentId ? parentId.toString() : "null";
    return contentId.toString() + ":" + parentType.toString() + ":" + parent;
  }
}
