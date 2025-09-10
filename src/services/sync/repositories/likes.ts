import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

// note naming, assumes pessimistic by default, optimistic opt-in
export default class LikesRepository extends SyncRepository<ContentLike> {
  static create() {
    return new LikesRepository(SyncRepository.getStore(ContentLike))
  }

  async isLikedOptimistic(contentId: number) {
    return await this.existOne(LikesRepository.generateId(contentId))
  }

  async areLikedOptimistic(contentIds: number[]) {
    return await this.existSome(contentIds.map(LikesRepository.generateId))
  }

  async likeOptimisticEager(contentId: number) {
    const like = await this.store.upsertOne(LikesRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })

    return await this.pushOneEagerlyById(like.id)
  }

  async unlikeOptimisticEager(contentId: number) {
    const id = await this.store.deleteOne(LikesRepository.generateId(contentId))
    return await this.pushOneEagerlyById(id)
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
