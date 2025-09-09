import UserPlaylistRepository from "./sync/repositories/playlists";
import {LikesRepository} from "./sync/repositories";
import {UserPlaylist} from "./sync/models";
import { getInstance } from '@/application/sync'

export async function testing()
{
    const repo = new UserPlaylistRepository(getInstance().getStore(UserPlaylist))
}

export async function downloadContent()
{
    //fetch sanity here, return video data

    //get content type. for now its just single content types

    addContentToDownloads(contentId)
}

function addContentToDownloads(contentId: number)
{
    const playlistId = getDownloadsPlaylist()

    addContentToDownloadPlaylist(contentId, playlistId)
}


function getDownloadsPlaylist(): number
{
    //find or create downloads playlist
    const playlists = new UserPlaylistRepository(store); //what is store here
    try {
        const playlist = await playlists.getDownloadsPlaylist()
    } catch () {
        playlists.create({DTO_here})
    }
    return

}

//TODO: note we need to create a different id for downloads. the downloaded playlist will not have a proper id and as
// such, contents within it will not be properly linked
// likely need an indexed id for the table. there would probably be one anyways
function addContentToDownloadPlaylist(contentId: number, playlistId: number)
{

}
