import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

// note naming, assumes pessimistic (confirms with server) by default,
// optimistic opt-in (reads locally (except if never once synced))

export default class LikesRepository extends SyncRepository<ContentLike> {
  async isLikedOptimistic(contentId: number) {
    return await this.existOne(LikesRepository.generateId(contentId))
  }

  async areLikedOptimistic(contentIds: number[]) {
    return await this.existSome(contentIds.map(LikesRepository.generateId))
  }

  async likeOptimistic(contentId: number) {
    return await this.upsertOne(LikesRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })
  }

  async unlikeOptimistic(contentId: number) {
    return await this.deleteOne(LikesRepository.generateId(contentId))
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
