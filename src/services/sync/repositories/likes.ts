import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";

export default class LikesRepository extends SyncRepository<ContentLike> {
  async create(contentId: number) {
    const record = await this.upsert(LikesRepository.generateId(contentId), r => {
      r.content_id = contentId;
    })

    return await this.pushOneEagerly(record)
  }

  private static generateId(contentId: number) {
    return contentId.toString();
  }
}
