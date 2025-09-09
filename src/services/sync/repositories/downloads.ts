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
      record.playlistResource = dataObject.playlistResource
      record.isDownloadsCollection = dataObject.isDownloadsCollection
      // Only set created_at if it doesn't exist (new record)
      if (!record._raw['created_at']) {
        record._setRaw('created_at', new Date().toISOString())
      }
      // Always update the updated_at timestamp
      record._setRaw('updated_at', new Date().toISOString())
    })
  }

  async getAllDownloadedCollections() {
    return await this.store.readAll()
  }
}
