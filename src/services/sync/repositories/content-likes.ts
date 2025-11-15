import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

export default class LikesRepository extends SyncRepository<ContentLike> {
  async isLiked(contentId: number) {
    return await this.existOne(LikesRepository.generateId(contentId))
  }

  async areLiked(contentIds: number[]) {
    return await this.existSome(contentIds.map(LikesRepository.generateId))
  }

  async like(contentId: number) {
    return await this.upsertOne(LikesRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })
  }

  async unlike(contentId: number) {
    return await this.deleteOne(LikesRepository.generateId(contentId))
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
