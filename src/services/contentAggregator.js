import {
  getLastInteractedOf, getNavigateTo,
  getNextLesson, getProgressDateByIds,
  getProgressPercentageByIds,
  getProgressStateByIds,
  getResumeTimeSecondsByIds
} from "./contentProgress"
import {isContentLikedByIds} from "./contentLikes"
import {fetchLastInteractedChild, fetchLikeCount} from "./railcontent"

/**
 * Combine sanity data with BE contextual data.
 *
 * Supported dataStructures
 *   [{}, {}, {}] <-  fetchRelatedLessons || on playback page (side bar)
 *   {} <- fetchLessonContent || on playback page (main window)
 *   in the examples below, dataField would be set to `children`
 *   [{id, children}, {id, children,}] <- getTabData || catalog Page
 *   {childen, } <- getPackData || pack index page
 *
 *
 * @param dataPromise - promise or method that provides sanity data
 * @param dataArgs - Arguments to pass to the dataPramise. The final parameter is expected to take the form of the options object
 * @param options - Options has two categories of flags. two for defining the incoming data structure, and the rest of which data to add to the results. Unless otherwise specified the field flags use the format add<X> and add the <X> to the results
 * @param options.dataField - the document field to process. (this is often 'children', 'entity', or 'lessons'
 * @param options.dataField_includeParent - flag: if set with dataField, used to process the same contextual data for the parent object/array as well as the children
 * @param options.addProgressPercentage - add progressPerecentage field
 * @param options.addIsLiked - add isLikedField
 * @param options.addLikeCount - add likeCount field
 * @param options.addProgressStatus - add progressStatus field
 * @param options.addProgressTimestamp - add progressTimestamp field
 * @param options.addResumeTimeSeconds - add resumeTimeSeconds field
 * @param options.addLastInteractedChild - add lastInteractedChild field. This may be different from nextLesson
 * @param options.addNextLesson - add nextLesson field. For collection type content. each collection has different logic for calculating this data
 *
 * @returns {Promise<{ data: Object[] } | false>} - A promise that resolves to the fetched content data + added data or `false` if no data is found.
 *
 * @example
 * // GetLesson
 *    const response = await addContextToContent(fetchLessonContent, id, {
 *       addIsLiked: true,
 *       addProgressStatus: true,
 *       addLikeCount: true,
 *       addResumeTimeSeconds: true,
 *     })
 *
 * @example - addContextToContent retuns [{id, title, content}], so must be unpacked with dataField, and indicate the dataField_isParentArray
 * const sanityData = await addContextToContent(fetchContentRows, brand, pageName, contentRowSlug, {
 *     dataField: 'content',
 *     dataField_parentIsArray: true,
 *     addProgressStatus: true,
 *     addProgressPercentage: true,
 *     addNextLesson: true
 *   })
 *
 */

export async function addContextToContent(dataPromise, ...dataArgs)
{
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    dataField = null,
    dataField_includeParent = false,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addProgressStatus = false,
    addProgressTimestamp = false,
    addResumeTimeSeconds = false,
    addLastInteractedChild = false,
    addNextLesson = false,
    addNavigateTo = false,
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  let data = await dataPromise(...dataParam)
  const isDataAnArray = Array.isArray(data)
  if(isDataAnArray && data.length === 0) return data
  if(!data) return false

  const items = extractItemsFromData(data, dataField, isDataAnArray, dataField_includeParent) ?? []
  const ids = items.map(item => item?.id).filter(Boolean)
  if(ids.length === 0) return data

  const [progressData, isLikedData, resumeTimeData, lastInteractedChildData, nextLessonData, navigateToData] = await Promise.all([
    addProgressPercentage || addProgressStatus || addProgressTimestamp ? getProgressDateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
    addLastInteractedChild ? fetchLastInteractedChild(ids)  : Promise.resolve(null),
    addNextLesson ? getNextLesson(items) : Promise.resolve(null),
    addNavigateTo ? getNavigateTo(items) : Promise.resolve(null),
  ])
  if (addNextLesson) console.log('AddNextLesson is depreciated in favour of addNavigateTo')

  const addContext = async (item) => {
      let i = ({
        ...item,
        ...(addProgressPercentage ? { progress_percentage: progressData?.[item.id]['progress'] } : {}),
        ...(addProgressStatus ? { progress_status: progressData?.[item.id]['status'] } : {}),
        ...(addProgressTimestamp ? { progress_timestamp: progressData?.[item.id]['last_update'] } : {}),
        ...(addIsLiked ? { is_liked: isLikedData?.[item.id] } : {}),
        ...(addLikeCount && ids.length === 1 ? { like_count: await fetchLikeCount(item.id) } : {}),
        ...(addResumeTimeSeconds ? { resume_time: resumeTimeData?.[item.id] } : {}),
        ...(addLastInteractedChild ? { last_interacted_child: lastInteractedChildData?.[item.id] } : {}),
        ...(addNextLesson ? { next_lesson: nextLessonData?.[item.id] } : {}),
        ...(addNavigateTo ? { navigate_to: navigateToData?.[item.id] } : {}),
      })
      // TODO REMOVE https://musora.atlassian.net/browse/BEH-901
      i = {
        ...i,
        ...(addProgressPercentage ? { progressPercentage: i.progress_percentage} : {}),
        ...(addProgressStatus ? { progressStatus: i.progress_status} : {}),
        ...(addProgressTimestamp ? { progressTimestamp: i.progress_timestamp } : {}),
        ...(addIsLiked ? { isLiked: i.is_liked } : {}),
        ...(addLikeCount && ids.length === 1 ? { likeCount: i.like_count } : {}),
        ...(addResumeTimeSeconds ? { resumeTime: i.resume_time } : {}),
        ...(addLastInteractedChild ? { lastInteractedChild: i.last_interacted_child } : {}),
        ...(addNextLesson ? { nextLesson: i.next_lesson } : {}),
        ...(addNavigateTo ? { navigateTo: i.navigate_to } : {}),
      }
      return i
    }

  return await processItems(data, addContext, dataField, isDataAnArray, dataField_includeParent)
}

export async function getNavigateToForPlaylists(data, {dataField = null} = {} )
{
  let playlists = extractItemsFromData(data, dataField, false, false)
  let allIds = []
  playlists.forEach((playlist) => allIds = [...allIds, ...playlist.items.map(a => a.content_id)])
  const progressOnItems = await getProgressStateByIds(allIds);
  const addContext = async (playlist) => {
    const allItemsCompleted = playlist.items.every(i => {
      const itemId = i.content_id;
      const progress = progressOnItems[itemId];
      return progress && progress === 'completed';
    });
    let nextItem = playlist.items[0] ?? null;
    if (!allItemsCompleted) {
      const lastItemProgress = progressOnItems[playlist.last_engaged_on];
      const index = playlist.items.findIndex(i => i.content_id === playlist.last_engaged_on);
      if (lastItemProgress === 'completed') {
        nextItem = playlist.items[index + 1] ?? nextItem;
      } else {
        nextItem = playlist.items[index] ?? nextItem;
      }
    }
    playlist.navigateTo = {
      ...nextItem,
      playlist_id: playlist.id,
    }
    return playlist
  }
  return await processItems(data, addContext, dataField, false, false,)
}

function extractItemsFromData(data, dataField, isParentArray, includeParent)
{
  let items = []
  if (dataField) {
    if (isParentArray) {
      for (const parent of data) {
        items = [...items, ...parent[dataField]]
      }
    } else {
      items = data[dataField]
    }
    if (includeParent) {
      if (isParentArray) {
        for (const parent of data) {
          items = [...items, ...parent]
        }
      } else {
        items = [...items, data]
      }
    }
  } else if (Array.isArray(data)) {
    items = data;
  } else if (data?.id) {
    items = [data]
  }
  return items
}

async function processItems(data, addContext, dataField, isParentArray, includeParent)
{
  if (dataField) {
    if (isParentArray) {
      for(let parent of data) {
        parent[dataField] = Array.isArray(parent[dataField])
          ? await Promise.all(parent[dataField].map(addContext))
          : await addContext(parent[dataField])
      }
    } else {
      data[dataField] = Array.isArray(data[dataField])
        ? await Promise.all(data[dataField].map(addContext))
        : await addContext(data[dataField])
    }
    if (includeParent) {
      data = isParentArray
        ? await Promise.all(data.map(addContext))
        : await addContext(data)
    }
    return data
  } else {
    return Array.isArray(data)
      ? await Promise.all(data.map(addContext))
      : await addContext(data)
  }
}


