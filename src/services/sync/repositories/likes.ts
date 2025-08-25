import SyncRepository from "./base";
import { Q } from "@nozbe/watermelondb";

export default class LikesRepository extends SyncRepository {
  async create(contentId: string) {
    const id = LikesRepository.generateId(contentId)

    await this.store.db.write(async () => {
      return this.store.collection.create(record => {
        record._raw.id = id;
        record._raw['content_id'] = contentId;
      })
    })

    const record = await this.store.collection.query(Q.where('id', id)).fetch().then(records => records[0])
    return await this.store.pushOneImmediate(record)
  }

  private static generateId(contentId: string) {
    return contentId;
  }
}
