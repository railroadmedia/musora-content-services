import UserPlaylistRepository from "./sync/repositories/playlists";
import {LikesRepository} from "./sync/repositories";
import {UserPlaylist} from "./sync/models";
import { getInstance } from '@/application/sync'
import {fetchHandler} from "../index";

const BASE_PATH = `/api/content-org`

export async function testing()
{
    const repo = new UserPlaylistRepository(getInstance().getStore(UserPlaylist))
}

export async function downloadPlaylist(playlistId: number)
{
    //request BE resource
    const url = `${BASE_PATH}/v1/user/downloads/playlist/${playlistId}`
    const response = await fetchHandler(url) //returns PlaylistResource

    //create DTO for watermelonDB row (so all columns)


    //upsert to watermelonDB model


    addContentToDownloads(contentId)
}

export async function downloadCollection(contentId: number)
{
    //request BE resource
    const url = `${BASE_PATH}/v1/user/downloads/collection/${contentId}`
    return await fetchHandler(url)

    addContentToDownloads(contentId)
}

export async function downloadIndividual()
{

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
