import {
  getNavigateTo,
  getProgressDataByIds,
  getProgressStateByIds,
  getResumeTimeSecondsByIds,
} from './contentProgress'
import { isContentLikedByIds } from './contentLikes'
import { fetchLikeCount } from './railcontent'

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
 * @param options.addLastInteractedChild - add lastInteractedChild field. This may be different from navigateTo.id
 * @param options.collection {object|null} - define collection parameter: collection = { id: <collection_id>, type: <collection_type> } . This is needed for different collection types like learning paths.
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
 *     addNavigateTo: true
 *   })
 *
 */

// need to add method support.
// this means returning collection_type and collection_id
export async function addContextToContent(dataPromise, ...dataArgs) {
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    collection = null, // this is needed for different collection types like learning paths. has .id and .type
    dataField = null,
    dataField_includeParent = false,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addProgressStatus = false,
    addProgressTimestamp = false,
    addResumeTimeSeconds = false,
    addNavigateTo = false,
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  let data = await dataPromise(...dataParam)
  const isDataAnArray = Array.isArray(data)
  if (isDataAnArray && data.length === 0) return data
  if (!data) return false

  const items = extractItemsFromData(data, dataField, isDataAnArray, dataField_includeParent) ?? []
  const ids = items.map((item) => item?.id).filter(Boolean)
  if (ids.length === 0) return data

  const [
    progressData,
    isLikedData,
    resumeTimeData,
    lastInteractedChildData,
    navigateToData,
  ] = await Promise.all([ //for now assume these all return `collection = {type, id}`. it will be so when watermelon here
    addProgressPercentage || addProgressStatus || addProgressTimestamp
      ? getProgressDataByIds(ids, collection) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids, collection) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids, collection) : Promise.resolve(null),
    addNavigateTo ? getNavigateTo(items, collection) : Promise.resolve(null),
  ])

  const addContext = async (item) => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressData?.[item.id]?.progress } : {}),
    ...(addProgressStatus ? { progressStatus: progressData?.[item.id]?.status } : {}),
    ...(addProgressTimestamp ? { progressTimestamp: progressData?.[item.id]?.last_update } : {}),
    ...(addIsLiked ? { isLiked: isLikedData?.[item.id] } : {}),
    ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[item.id] } : {}),
    ...(addNavigateTo ? { navigateTo: navigateToData?.[item.id] } : {}),
  })

  return await processItems(data, addContext, dataField, isDataAnArray, dataField_includeParent)
}

export async function getNavigateToForPlaylists(data, { dataField = null } = {}) {
  let playlists = extractItemsFromData(data, dataField, false, false)
  let allIds = []
  playlists.forEach(
    (playlist) => (allIds = [...allIds, ...playlist.items.map((a) => a.content_id)])
  )
  const progressOnItems = await getProgressStateByIds(allIds)
  const addContext = async (playlist) => {
    // Filter out locked items (where need_access === true) and scheduled content
    const accessibleItems = playlist.items.filter((item) => !item.need_access && item.status !== 'scheduled')

    const allItemsCompleted = accessibleItems.every((i) => {
      const itemId = i.content_id
      const progress = progressOnItems[itemId]
      return progress && progress === 'completed'
    })
    let nextItem = accessibleItems[0] ?? playlist.items[0] ?? null
    if (!allItemsCompleted) {
      const lastItemProgress = progressOnItems[playlist.last_engaged_on]
      const index = accessibleItems.findIndex((i) => i.content_id === playlist.last_engaged_on)
      if (lastItemProgress === 'completed') {
        nextItem = accessibleItems[index + 1] ?? nextItem
      } else {
        nextItem = accessibleItems[index] ?? nextItem
      }
    }
    playlist.navigateTo = {
      ...nextItem,
      playlist_id: playlist.id,
    }
    return playlist
  }
  return await processItems(data, addContext, dataField, false, false)
}

function extractItemsFromData(data, dataField, isParentArray, includeParent) {
  let items = []
  if (dataField) {
    if (isParentArray) {
      for (const parent of data) {
        const fieldValue = parent[dataField]
        if (Array.isArray(fieldValue)) {
          items = [...items, ...fieldValue]
        } else if (fieldValue && typeof fieldValue === 'object') {
          items = [...items, fieldValue]
        }
      }
    } else {
      const fieldValue = data[dataField]
      if (Array.isArray(fieldValue)) {
        items = fieldValue
      } else if (fieldValue && typeof fieldValue === 'object') {
        items = [fieldValue]
      }
    }
    if (includeParent) {
      if (isParentArray) {
        for (const parent of data) {
          if(Array.isArray(parent)){
            items = [...items, ...parent]
          } else {
            items = [...items, parent]
          }
        }
      } else {
        items = [...items, data]
      }
    }
  } else if (Array.isArray(data)) {
    items = data
  } else if (data?.id) {
    items = [data]
  }
  return items
}

async function processItems(data, addContext, dataField, isParentArray, includeParent) {
  if (dataField) {
    if (isParentArray) {
      for (let parent of data) {
        const fieldValue = parent[dataField]
        if (Array.isArray(fieldValue)) {
          parent[dataField] = await Promise.all(fieldValue.map(addContext))
        } else if (fieldValue && typeof fieldValue === 'object') {
          parent[dataField] = await addContext(fieldValue)
        }
      }
    } else {
      const fieldValue = data[dataField]
      if (Array.isArray(fieldValue)) {
        data[dataField] = await Promise.all(fieldValue.map(addContext))
      } else if (fieldValue && typeof fieldValue === 'object') {
        data[dataField] = await addContext(fieldValue)
      }
    }
    if (includeParent) {
      data = isParentArray ? await Promise.all(data.map(addContext)) : await addContext(data)
    }
    return data
  } else {
    return Array.isArray(data) ? await Promise.all(data.map(addContext)) : await addContext(data)
  }
}
