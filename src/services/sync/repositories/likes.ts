import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

export default class LikesRepository extends SyncRepository<ContentLike> {
  async create(contentId: number) {
    return await this.upsert(LikesRepository.generateId(contentId), record => {
      record.content_id = contentId;
    })
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
