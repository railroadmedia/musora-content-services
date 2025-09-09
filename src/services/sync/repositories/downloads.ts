import SyncRepository from "./base";
import Download from "../models/Download";

export default class DownloadsRepository extends SyncRepository<Download> {
  async getDownloadsCollection() {
    return await this.store.readOneWhere('is_downloads_collection', true)
  }

  async create(parentId: string, dataObject: object) {
    return await this.upsert(parentId, record => {
      record.parentId = parentId
      record.type = dataObject.type
      //continue once we have the resource set up
    })
  }

  async getAllDownloadedCollections() {
    return await this.store.readAll()
  }
}
