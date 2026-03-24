import {
  extractFromRecordId,
  generateRecordId,
  getNavigateTo,
  getNavigateToForMethod,
  getProgressDataByIds,
  getProgressDataByRecordIds,
  getResumeTimeSecondsByIds,
  getResumeTimeSecondsByRecordIds,
} from './contentProgress.js'
import { isContentLikedByIds } from './contentLikes'
import { fetchLikeCount } from './railcontent'
import {COLLECTION_TYPE} from "./sync/models/ContentProgress";
import {getContentAwardsByIds} from "./awards/award-query.js";

/**
 * Combine sanity data with BE contextual data.
 *
 * Supported dataStructures
 *   [{}, {}, {}] <-  fetchRelatedLessons || on playback page (side bar)
 *   {} <- fetchLessonContent || on playback page (main window)
 *   in the examples below, dataField would be set to `children`
 *   [{id, children}, {id, children,}] <- getTabData || catalog Page
 *   {children, } <- getCourseCollectionData || Course Collection index page
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

export async function addContextToContent(dataPromise, ...dataArgs) {
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  // todo: merge addProgressData with addResumeTimeSeconds to one watermelon call
  const {
    dataField = null,
    dataField_includeParent = false,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addProgressStatus = false,
    addProgressTimestamp = false,
    addResumeTimeSeconds = false,
    addNavigateTo = false,
    addAwards = false,
  } = options

  let dataFields = dataField ? [dataField] : []

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
    navigateToData,
    awards,
  ] = await Promise.all([
    addProgressPercentage || addProgressStatus || addProgressTimestamp
      ? getProgressDataByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
    addNavigateTo ? getNavigateTo(items) : Promise.resolve(null),
    addAwards ? getContentAwardsByIds(ids) : Promise.resolve(null),
  ])

  const addContext = async (item) => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressData?.[item.id]?.progress } : {}),
    ...(addProgressStatus ? { progressStatus: progressData?.[item.id]?.status } : {}),
    ...(addProgressTimestamp ? { progressTimestamp: progressData?.[item.id]?.last_update } : {}),
    ...(addIsLiked ? { isLiked: isLikedData?.[item.id] } : {}),
    ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.get(item.id) } : {}),
    ...(addNavigateTo ? { navigateTo: navigateToData?.[item.id] } : {}),
    ...(addAwards ? { awards: awards?.[item.id].awards || [] } : {}),
  })

  return await processItems(data, addContext, dataFields, isDataAnArray, dataField_includeParent)
}

/**
 * Enriches method content (learning paths) with contextual data.
 *
 * Key behaviors:
 * 1. Enriches all learning paths in a method structure
 * 2. Auto-sets collection for learning-path-v2 items when no collection specified
 * 3. Enriches intro videos when dataField_includeIntroVideo is true
 *
 * @param dataPromise - promise or method that provides sanity data
 * @param dataArgs - Arguments to pass to the dataPromise
 * @param options - Same as addContextToContent, plus:
 * @param options.dataField_includeIntroVideo - If true, adds progress to intro_video field where it exists
 *
 * @returns {Promise<Object | false>} - Enriched data or false if no data found
 *
 * @example
 * // Enrich method structure with all learning paths
 * const method = await addContextToMethodContent(fetchMethodV2Structure, brand, {
 *   dataField: 'learningPaths',
 *   dataField_includeIntroVideo: true,
 *   addProgressStatus: true,
 *   addProgressPercentage: true,
 * })
 *
 * @example
 * // Enrich single learning path with intro video
 * const lp = await addContextToMethodContent(fetchByRailContentId, lpId, 'learning-path-v2', {
 *   collection: { id: lpId, type: 'learning-path-v2' },
 *   dataField: 'children',
 *   dataField_includeParent: true,
 *   dataField_includeIntroVideo: true,
 *   addProgressStatus: true,
 * })
 */
export async function addContextToLearningPaths(dataPromise, ...dataArgs) {
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  // todo: merge addProgressData with addResumeTimeSeconds to one watermelon call
  const {
    dataField = null,
    dataField_includeParent = false,
    dataField_includeIntroVideo = false,
    addProgressPercentage = false,
    addProgressStatus = false,
    addProgressTimestamp = false,
    addIsLiked = false,
    addLikeCount = false,
    addResumeTimeSeconds = false,
    addNavigateTo = false,
    addAwards = false,
  } = options

  let dataFields = dataField ? [dataField] : []
  if (dataField_includeIntroVideo) {
    dataFields.push('intro_video')
  }

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  let data = await dataPromise(...dataParam)
  const isDataAnArray = Array.isArray(data)
  if (isDataAnArray && data.length === 0) return data
  if (!data) return false

  let items, recordIds
  [data, items, recordIds] = addRecordIdsToData(data, dataField, isDataAnArray, dataField_includeParent, dataField_includeIntroVideo) ?? []
  if (items.length === 0) return data

  const ids = recordIds.map(item => extractFromRecordId(item).contentId)

  const [
    progressData,
    isLikedData,
    resumeTimeData,
    navigateToData,
    awards,
  ] = await Promise.all([
    addProgressPercentage || addProgressStatus || addProgressTimestamp
      ? getProgressDataByRecordIds(recordIds) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByRecordIds(recordIds) : Promise.resolve(null),
    addNavigateTo ? getNavigateToForMethod(items) : Promise.resolve(null),
    addAwards ? getContentAwardsByIds(ids) : Promise.resolve(null),
  ])

  const addContext = async (item) => {
    const itemId = item.id || 0
    const itemRecordId = item.record_id || 0
    delete item.record_id

    return {
      ...item,
      ...(addProgressPercentage ? { progressPercentage: progressData?.[itemRecordId]?.progress } : {}),
      ...(addProgressStatus ? { progressStatus: progressData?.[itemRecordId]?.status } : {}),
      ...(addProgressTimestamp ? { progressTimestamp: progressData?.[itemRecordId]?.last_update } : {}),
      ...(addIsLiked ? { isLiked: isLikedData?.[itemId] } : {}),
      ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(itemId) } : {}),
      ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[itemRecordId] } : {}),
      ...(addNavigateTo ? { navigateTo: navigateToData?.[itemId] } : {}),
      ...(addAwards ? { awards: awards?.[itemId].awards || [] } : {}),
    }
  }

  return await processItems(data, addContext, dataFields, isDataAnArray, dataField_includeParent)
}

export async function getNavigateToForPlaylists(data, { dataField = null } = {}) {
  let dataFields = dataField ? [dataField] : []

  let playlists = extractItemsFromData(data, dataField, false, false)

  const allIds = [...new Set(playlists.flatMap(playlist => playlist.items.map(item => item.content_id)))]
  const progressOnItems = await getProgressDataByIds(allIds) // currently playlist progress IS a-la-carte progress.

  const addContext = async (playlist) => {
    // Filter out locked items (where need_access === true) and scheduled content
    const accessibleItems = playlist.items.filter((item) => !item.need_access && item.status !== 'scheduled')

    const allItemsCompleted = accessibleItems.every((item) => {
      const progress = progressOnItems[item.content_id]
      return progress?.status === 'completed'
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
  return await processItems(data, addContext, dataFields, false, false)
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

function addRecordIdsToData(data, dataField, isDataAnArray, includeParent, includeIntroVideo) {
  let items = []
  let recordIds = []

  const extractLearningPathItems = (content) => {
    if (content.type === COLLECTION_TYPE.LEARNING_PATH) {
      const c = {type: COLLECTION_TYPE.LEARNING_PATH, id: content.id}

      if (!dataField || (dataField && includeParent)) {
        content.record_id = generateRecordId(content.id, c)
        items.push(content)
        recordIds.push(content.record_id)
      }
      if (includeIntroVideo) {
        content.intro_video.record_id = generateRecordId(content.intro_video.id, null)
        items.push(content.intro_video)
        recordIds.push(content.intro_video.record_id)
      }
      if (dataField) {
        for (const child of content[dataField] ?? []) {
          child.record_id = generateRecordId(child.id, c)
          items.push(child)
          recordIds.push(child.record_id)
        }
      }
    } else { // is a lesson id, cant determine which collection it belongs to
      // do not add it as we cant determine collection
      // items.push(...getDataTuple([data], collection))
    }
  }

  if (isDataAnArray) {
    for (const content of data) {
      extractLearningPathItems(content)
    }
  } else {
    extractLearningPathItems(data)
  }
  return [data, items, recordIds]
}

async function processItems(data, addContext, dataFields, isParentArray, includeParent) {
  if (dataFields.length > 0) {
    if (isParentArray) {
      for (let parent of data) {
        for (const field of dataFields) {
          const fieldValue = parent[field]
          if (Array.isArray(fieldValue)) {
            parent[field] = await Promise.all(fieldValue.map(addContext))
          } else if (fieldValue && typeof fieldValue === 'object') {
            parent[field] = await addContext(fieldValue)
          }
        }
      }
    } else {
      for (const field of dataFields) {
        const fieldValue = data[field]
        if (Array.isArray(fieldValue)) {
          data[field] = await Promise.all(fieldValue.map(addContext))
        } else if (fieldValue && typeof fieldValue === 'object') {
          data[field] = await addContext(fieldValue)
        }
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
