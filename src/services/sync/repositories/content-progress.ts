import SyncRepository from "./base";
import ContentProgress from "../models/ContentProgress";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))

export default class ProgressRepository extends SyncRepository<ContentProgress> {
  static create() {
    return new ProgressRepository(SyncRepository.getStore(ContentProgress))
  }

  async isLikedOptimistic(contentId: number) {
    return await this.existOne(ProgressRepository.generateId(contentId))
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

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
