import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

export default class LikesRepository extends SyncRepository<ContentLike> {
  async isLiked(contentId: number) {
    return await this.existOne(ContentLike.generateId(contentId))
  }

  async areLiked(contentIds: number[]) {
    return await this.existSome(contentIds.map(ContentLike.generateId))
  }

  async like(contentId: number) {
    return await this.upsertOne(ContentLike.generateId(contentId), r => {
      r.content_id = contentId;
    })
  }

  async unlike(contentId: number) {
    return await this.deleteOne(ContentLike.generateId(contentId))
  }
}
