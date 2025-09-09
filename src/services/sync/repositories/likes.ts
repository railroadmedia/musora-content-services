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

  async like(contentId: number) {
    const record = await this.store.upsert(LikesRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })

    return await this.pushOneEagerly(record)
  }

  async unlike(contentId: number) {
    const record = (await this.store.deleteOne(LikesRepository.generateId(contentId)))! // todo - handle null?
    return await this.pushOneEagerly(record)
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
