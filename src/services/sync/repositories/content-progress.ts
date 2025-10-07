import SyncRepository from "./base";
import ContentProgress from "../models/ContentProgress";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))
interface ContentProgressDTO {
  contentId: number,
  state: string,
  progressPercent: number,
  parentType?: number,
  parentId?: number
}

const PARENT_ENUM_DEFAULT = null
const PARENT_ENUM_LEARNING_PATH = 1

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  // todo is it useful to have limit here without order by ?
  // todo create enum of parent type so param can input "method", and then can generalize functions

  async queryWhere(clauses: Record<string, any>[], limit: number = null) {
    return await this.readAllWhere(clauses, limit)
  }

  async getAllMethodProgress(brand: string, limit: number = null) {
    return await this.readAllWhere([{brand: brand}, {parent_type: PARENT_ENUM_LEARNING_PATH}], limit)
  }

  async getAllNonMethodProgress(brand: string, limit: number = null) {
    return await this.readAllWhere([{brand: brand}, {parent_type: null}], limit)
  }

  async getAllProgress(brand: string, limit: number = null) {
    return await this.readAllWhere([{brand: brand}], limit)
  }

  async getLearningPathProgress(learningPathId: number) {
    return await this.readAllWhere([{parent_type: PARENT_ENUM_LEARNING_PATH}, {parent_id: learningPathId}])
  }

  async getStandardProgressByContentId(contentId: number) {
    return await this.readOne(ProgressRepository.generateId(contentId, PARENT_ENUM_DEFAULT, null))
  }

  async getStandardProgressByContentIds(contentIds: number[]) {
    return await this.readSome(contentIds.map((c) => ProgressRepository.generateId(c, PARENT_ENUM_DEFAULT, null)))
  }

  async getMethodProgressByContentId(contentId: number, parentId: number) {
    return await this.readOne(ProgressRepository.generateId(contentId, PARENT_ENUM_LEARNING_PATH, parentId))
  }

  async getMethodProgressByContentIds(contentIds: number[], parentId: number) {
    return await this.readSome(contentIds.map((c) => ProgressRepository.generateId(c, PARENT_ENUM_LEARNING_PATH, parentId)))
  }



  async writeStandardProgress({
                        contentId,
                        state,
                        progressPercent,
                      }: ContentProgressDTO) {
    const progress = await this.store.upsertOne(ProgressRepository.generateId(contentId, PARENT_ENUM_DEFAULT, null), r => {
      r.content_id = contentId;
      r.state = state;
      r.progress_percent = progressPercent;
      r.parent_type = PARENT_ENUM_DEFAULT;
      r.parent_id = null;
    })
    return await this.pushOneEagerlyById(progress.id)
  }

  async writeMethodProgress({
                              contentId,
                              state,
                              progressPercent,
                              parentId,
  }: ContentProgressDTO) {
    const progress = await this.store.upsertOne(ProgressRepository.generateId(contentId, PARENT_ENUM_LEARNING_PATH, parentId), r => {
      r.content_id = contentId;
      r.state = state;
      r.progress_percent = progressPercent;
      r.parent_type = PARENT_ENUM_LEARNING_PATH;
      r.parent_id = parentId;
    })
    return await this.pushOneEagerlyById(progress.id)
  }

  async getProgressOptimistic(contentId: number) {
    return await this.readOne(ProgressRepository.generateId(contentId))
  }

  async getProgressesOptimistic(contentIds: number[]) {
    return await this.readSome(contentIds.map(ProgressRepository.generateId))
  }

  async areLikedOptimistic(contentIds: number[]) {
    return await this.existSome(contentIds.map(ProgressRepository.generateId))
  }

  async likeOptimisticEager(contentId: number) {
    const like = await this.store.upsertOne(ProgressRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })

    return await this.pushOneEagerlyById(like.id)
  }

  async unlikeOptimisticEager(contentId: number) {
    const id = await this.store.deleteOne(ProgressRepository.generateId(contentId))
    return await this.pushOneEagerlyById(id)
  }

  private static generateId(contentId: number, parentType: number = null, parentId: number = null) {
    return contentId.toString() + ":" + parentType.toString() + ":" + parentId.toString();
  }
}
