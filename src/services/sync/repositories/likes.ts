import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

export default class LikesRepository extends SyncRepository<ContentLike> {
  async create(contentId: string) {
    return await this.upsert(LikesRepository.generateId(contentId), record => {
      record.contentId = contentId;
    })
  }

  private static generateId(contentId: string) {
    return contentId;
  }
}
