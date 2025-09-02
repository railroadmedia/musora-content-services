import SyncRepository from "./base";
import ContentLike from "../models/ContentLike";
import UserPlaylist from "../models/UserPlaylist";

export default class UserPlaylistRepository extends SyncRepository<UserPlaylist> {
  async getDownloadsPlaylist() {
    return await this.store.readOneWhere('is_downloads_collection', true)
  }


  async create(playlistId: string, playlistName: string, playlistCategory: string, playlistDescription: string, playlistDuration: string, isDownloadsCollection: boolean) {
    return await this.upsert(playlistId, record => {
      record.playlistData = {
        playlist_id: playlistId,
        name: playlistName,
        category: playlistCategory,
        description: playlistDescription,
        duration: playlistDuration,
        is_downloads_collection: isDownloadsCollection
      }
    })
  }

  async getAllDownloadedPlaylists() {
    return await this.store.readAll()
  }
}
