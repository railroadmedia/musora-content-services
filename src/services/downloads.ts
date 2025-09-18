import {fetchByRailContentIds, fetchParentForDownload} from './sanity.js';
import {fetchPlaylist} from "./content-org/playlists.js";


// Type definitions
interface LeafNode {
  id: string | number;
  parent_id: string | number | null;
  length_in_seconds: number;
  status: string;
}

interface ParentContentData {
  id: string | number;
  [key: string]: any;
}

interface ChildItem {
  id: string | number;
  isLeaf?: boolean;
  length_in_seconds: number;
  status: string;
  children?: ChildItem[];
}

interface LastChildItem {
  id: string | number;
  length_in_seconds: number;
  status: string;
  children?: ChildItem[];
}

interface Document {
  id: string | number;
  lastChildItems?: LastChildItem[];
  parent_content_data?: ParentContentData[];
  length_in_seconds: number;
  status: string;
}

interface Response {
  content: any[]
  group: any[]
}

// Main function. this is a copy of fetchLeafNodesWithDurationForContent() in mpb SanityGateway
function getLeafNodes(document: Document | null): LeafNode[] {
  const leafNodes: LeafNode[] = [];

  if (document) {
    if (!document.lastChildItems) {
      let parent: ParentContentData | undefined;
      if (document.parent_content_data) {
        parent = document.parent_content_data[document.parent_content_data.length - 1];
      }

      leafNodes.push({
        id: document.id,
        parent_id: parent?.id ?? null,
        length_in_seconds: document.length_in_seconds,
        status: document.status,
      });
    }

    const lastChildItems = document.lastChildItems ?? [];
    for (const item of lastChildItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.isLeaf) {
            leafNodes.push({
              id: child.id,
              parent_id: item.id,
              length_in_seconds: child.length_in_seconds,
              status: child.status,
            });
          }
        }
      } else {
        leafNodes.push({
          id: item.id,
          parent_id: document.id,
          length_in_seconds: item.length_in_seconds,
          status: item.status,
        });
      }
    }
  }

  return leafNodes;
}

export async function downloadCollectionMetadata(contentId: number)
{
  // fetch sanity resource by id (parent)
  // return children[] all the way down (up to 4 layers ig)
  const parent: any = await fetchParentForDownload(String(contentId))
  console.log('parent', parent)

  // use children[] array with js parsing to determine leaf nodes (lessons)
  const children = getLeafNodes(parent)

  //get id list of children
  const childrenIds = children.map(child => child.id)

  // with list of children ids, fetch resources for each lesson with fetchByRailcontentIds()
  const childrenResources = await fetchByRailContentIds(childrenIds, 'content-download', undefined, true)

  // structure into response object, and send
  const mappedChildren = childrenResources.map(child => ({
    [child.id]: { id: child.id, lesson: child }
  }));

  const key: string = 'collection:' + contentId
  const groupObject = [{
    [key]: {
      id: parent.id,
      type: "collection",
      brand: parent.brand || null,
      title: parent.title || null,
      items: childrenIds,
      append_items: false,    // if this is true, we can append this list to the existing one
    }
  }]

  const result: Response = { content: mappedChildren, group: groupObject };
  return result;

}

export async function downloadPlaylistMetadata(playlistId: number)
{
  // fetch sanity resource by id (parent)
  // return children[] all the way down (up to 4 layers ig)
  let playlist = await fetchPlaylist(playlistId);

  //get id list of children
  const childrenIds = playlist.items.map(child => child.content_id)

  // with list of children ids, fetch resources for each lesson with fetchByRailcontentIds()
  const childrenResources = await fetchByRailContentIds(childrenIds, 'content-download', undefined, true)

  // structure into playlist object, and send
  const mappedChildren = childrenResources.map(child => ({
    [child.id]: { id: child.id, lesson: child }
  }));

  const key: string = 'playlist:' + playlistId
  const groupObject = [{
    [key]: {
      id: playlist.id,
      type: "playlist",
      name: playlist.name || null,
      brand: playlist.brand || null,
      instrument: playlist.instrument || null,
      category: playlist.category || null,
      user: playlist.user || null,
      total_items: playlist.total_items || 0,
      items: childrenIds,
      append_items: false,    // if this is true, we can append this list to the existing one
    }
  }]

  const result: Response = { content: mappedChildren, group: groupObject };
  return result;

}
