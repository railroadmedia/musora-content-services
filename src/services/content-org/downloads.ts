import DownloadsRepository from "../sync/repositories/downloads";
import Download from "../sync/models/Download";
import { getInstance } from '@/application/sync'
import {fetchHandler, postPlaylistContentEngaged} from '../railcontent.js'

const BASE_PATH = `/api/content-org`

export async function downloadPlaylist(playlistId: number)
{
  //request BE resource
  const url = `${BASE_PATH}/v1/user/downloads/playlist/${playlistId}`
  const response = await fetchHandler(url) //returns PlaylistResource

  //create DTO for watermelonDB row
  const DTO = {
    type: 'playlist',
    contentId: String(playlistId),
    playlistResource: response,
    isDownloadsCollection: false
  }

  //upsert to watermelonDB model
  const downloadsRepo = new DownloadsRepository(getInstance().getStore(Download))
  await downloadsRepo.create(String(playlistId), DTO)
}
