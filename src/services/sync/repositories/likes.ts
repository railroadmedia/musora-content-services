import SyncRepository from "./base";

export default class LikesRepository extends SyncRepository {
  async create(contentId: string) {
    return await this.upsert(LikesRepository.generateId(contentId), record => {
      record._raw['content_id'] = contentId;
    })
  }

  private static generateId(contentId: string) {
    return contentId;
  }
}
