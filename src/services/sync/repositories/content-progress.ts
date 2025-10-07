import SyncRepository from "./base";
import ContentProgress from "../models/ContentProgress";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  async queryWhere(clauses: Record<string, any>[]) {
    return await this.readAllWhere(clauses)
  }

  async writeProgress({
                        number: contentId,
                        string: state,
                        number: progressPercent,
                        number: parentType = null,
                        number: parentId = null
                      }) {
    const progress = await this.store.upsertOne(ProgressRepository.generateId(contentId, parentType, parentId), r => {
      r.content_id = contentId;
      r.state = state;
      r.progress_percent = progressPercent;
      r.parent_type = parentType;
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
