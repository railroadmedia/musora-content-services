/**
 * @module Sanity-Services
 */
import {
  assignmentsField,
  chapterField,
  contentTypeConfig,
  DEFAULT_FIELDS,
  descriptionField,
  filtersToGroq,
  getChildFieldsForContentType,
  getFieldsForContentType,
  getFieldsForContentTypeWithFilteredChildren,
  getIntroVideoFields,
  instructorField,
  lessonTypesMapping,
  individualLessonsTypes,
  coursesLessonTypes,
  skillLessonTypes,
  entertainmentLessonTypes,
  filterTypes,
  tutorialsLessonTypes,
  transcriptionsLessonTypes,
  playAlongLessonTypes,
  jamTrackLessonTypes,
  resourcesField,
  showsTypes,
  SONG_TYPES,
  liveFields,
  addAwardTemplateToContent,
  contentAwardField,
} from '../contentTypeConfig.js'
import { fetchSimilarItems } from './recommendations.js'
import { getSongType, processMetadata, ALWAYS_VISIBLE_TABS, CONTENT_STATUSES } from '../contentMetaData.js'
import { GET } from '../infrastructure/http/HttpClient.ts'

import { FilterBuilder } from '../filterBuilder.js'
import { getPermissionsAdapter } from './permissions/index.ts'
import { getAllCompleted, getAllStarted, getAllStartedOrCompleted } from './contentProgress.js'
import { fetchRecentActivitiesActiveTabs } from './userActivity.js'
import {
  arrayJoinWithQuotes,
  getSanityDate,
  getDateOnly,
  buildRawQuery,
  buildQuery,
  buildEntityAndTotalQuery,
  getFilterOptions,
  getSortOrder,
} from '../lib/sanity/helper'
import { fetchSanity } from '../lib/sanity/fetch'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['fetchRelatedByLicense']

/**
 * Mapping from tab names to their underlying Sanity content types.
 * Used to determine if a tab has any content available.
 * @type {Object.<string, string[]>}
 */
const TAB_TO_CONTENT_TYPES = {
  'Single Lessons': individualLessonsTypes,
  Courses: coursesLessonTypes,
  'Skill Packs': skillLessonTypes,
  Entertainment: entertainmentLessonTypes,
  Tutorials: tutorialsLessonTypes,
  Transcriptions: transcriptionsLessonTypes,
  'Sheet Music': transcriptionsLessonTypes,
  Tabs: transcriptionsLessonTypes,
  'Play-Alongs': playAlongLessonTypes,
  'Jam Tracks': jamTrackLessonTypes,
}

/**
 * Fetch a song by its document ID from Sanity.
 *
 * @param {string} documentId - The ID of the document to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the song data or null if not found.
 *
 * @example
 * fetchSongById('abc123')
 *   .then(song => console.log(song))
 *   .catch(error => console.error(error));
 */
export async function fetchSongById(documentId) {
  const fields = getFieldsForContentType('song')
  const filterParams = {}
  const query = await buildQuery(
    `_type == "song" && railcontent_id == ${documentId}`,
    filterParams,
    fields,
    {
      isSingle: true,
    }
  )
  return fetchSanity(query, false)
}

/**
 * fetches from Sanity all content marked for removal next quarter
 *
 * @string brand
 * @number pageNumber
 * @number contentPerPage
 * @returns {Promise<Object|null>}
 */
export async function fetchLeaving(brand, { pageNumber = 1, contentPerPage = 20 } = {}) {
  const today = new Date()
  const isoDateOnly = getDateOnly(today)
  const filterString = `brand == '${brand}' && quarter_removed > '${isoDateOnly}'`
  const startEndOrder = getQueryFromPage(pageNumber, contentPerPage)
  const sortOrder = {
    sortOrder: 'quarter_removed asc, published_on desc, id desc',
    start: startEndOrder['start'],
    end: startEndOrder['end'],
  }
  const query = await buildQuery(
    filterString,
    { pullFutureContent: false, availableContentStatuses: CONTENT_STATUSES.PUBLISHED_ONLY },
    getFieldsForContentType('leaving'),
    sortOrder
  )
  return fetchSanity(query, true)
}

/**
 * fetches from Sanity all content marked for return next quarter
 *
 * @string brand
 * @number pageNumber
 * @number contentPerPage
 * @returns {Promise<Object|null>}
 */
export async function fetchReturning(brand, { pageNumber = 1, contentPerPage = 20 } = {}) {
  const today = new Date()
  const isoDateOnly = getDateOnly(today)
  const filterString = `brand == '${brand}' && quarter_published >= '${isoDateOnly}'`
  const startEndOrder = getQueryFromPage(pageNumber, contentPerPage)
  const sortOrder = {
    sortOrder: 'quarter_published asc, published_on desc, id desc',
    start: startEndOrder['start'],
    end: startEndOrder['end'],
  }
  const query = await buildQuery(
    filterString,
    { pullFutureContent: true, availableContentStatuses: CONTENT_STATUSES.DRAFT_ONLY },
    getFieldsForContentType('returning'),
    sortOrder
  )

  return fetchSanity(query, true)
}

/**
 * fetches from Sanity all songs coming soon (new) next quarter
 *
 * @string brand
 * @number pageNumber
 * @number contentPerPage
 * @returns {Promise<Object|null>}
 */
export async function fetchComingSoon(brand, { pageNumber = 1, contentPerPage = 20 } = {}) {
  const filterString = `brand == '${brand}' && _type == 'song'`
  const startEndOrder = getQueryFromPage(pageNumber, contentPerPage)
  const sortOrder = {
    sortOrder: 'published_on desc, id desc',
    start: startEndOrder['start'],
    end: startEndOrder['end'],
  }
  const query = await buildQuery(
    filterString,
    { getFutureContentOnly: true },
    getFieldsForContentType(),
    sortOrder
  )
  return fetchSanity(query, true)
}

/**
 *
 * @number page
 * @returns {number[]}
 */
function getQueryFromPage(pageNumber, contentPerPage) {
  const start = contentPerPage * (pageNumber - 1)
  const end = contentPerPage * pageNumber
  let result = []
  result['start'] = start
  result['end'] = end
  return result
}

/**
 * Fetch current number of artists for songs within a brand.
 * @param {string} brand - The current brand.
 * @returns {Promise<int|null>} - The fetched count of artists.
 */
export async function fetchSongArtistCount(brand) {
  const filter = await new FilterBuilder(
    `_type == "song" && brand == "${brand}" && references(^._id)`,
    { bypassPermissions: true }
  ).buildFilter()
  const query = `
  count(*[_type == "artist"]{
    name,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0])`
  return fetchSanity(query, true, { processNeedAccess: false })
}

export async function fetchPlayAlongsCount(
  brand,
  { searchTerm, includedFields, progressIds, progress }
) {
  const searchFilter = searchTerm
    ? `&& (artist->name match "${searchTerm}*" || instructor[]->name match "${searchTerm}*" || title match "${searchTerm}*" || name match "${searchTerm}*")`
    : ''

  // Construct the included fields filter, replacing 'difficulty' with 'difficulty_string'
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''

  // limits the results to supplied progressIds for started & completed filters
  const progressFilter = await getProgressFilter(progress, progressIds)
  const query = `count(*[brand == '${brand}' && _type == "play-along" ${searchFilter} ${includedFieldsFilter} ${progressFilter} ]) `
  return fetchSanity(query, true, { processNeedAccess: false })
}

/**
 * Fetch related songs for a specific brand and song ID.
 *
 * @param {string} brand - The brand for which to fetch related songs.
 * @param {string} songId - The ID of the song to find related songs for.
 * @returns {Promise<Object|null>} - A promise that resolves to an array of related song objects or null if not found.
 *
 * @example
 * fetchRelatedSongs('drumeo', '12345')
 *   .then(relatedSongs => console.log(relatedSongs))
 *   .catch(error => console.error(error));
 */
export async function fetchRelatedSongs(brand, songId) {
  const now = getSanityDate(new Date())
  const query = `
      *[_type == "song" && railcontent_id == ${songId}]{
        "entity": array::unique([
            ...(*[_type == "song" && brand == "${brand}" && railcontent_id != ${songId} && references(^.artist->_id)
            && (status in ['published'] || (status == 'scheduled' && defined(published_on) && published_on >= '${now}'))]{
            "type": _type,
            "id": railcontent_id,
            "url": web_url_path,
            "published_on": published_on,
            status,
            "image": thumbnail.asset->url,
            "permission_id": permission_v2,
            "fields": [
              {
                "key": "title",
                "value": title
              },
              {
                "key": "artist",
                "value": artist->name
              },
              {
                "key": "difficulty",
                "value": difficulty
              },
              {
                "key": "length_in_seconds",
                "value": soundslice[0].soundslice_length_in_second
              }
            ],
          }[0...10]),
            ...(*[_type == "song" && brand == "${brand}" && railcontent_id != ${songId} && references(^.genre[]->_id)
            && (status in ['published'] || (status == 'scheduled' && defined(published_on) && published_on >= '${now}'))]{
            "type": _type,
            "id": railcontent_id,
            "url": web_url_path,
            "published_on": published_on,
            "permission_id": permission_v2,
            status,
            "fields": [
              {
                "key": "title",
                "value": title
              },
              {
                "key": "artist",
                "value": artist->name
              },
              {
                "key": "difficulty",
                "value": difficulty
              },
              {
                "key": "length_in_seconds",
                "value": soundslice[0].soundslice_length_in_second
              }
            ],
            "data": [{
              "key": "thumbnail_url",
              "value": thumbnail.asset->url
            }]
          }[0...10])
        ])[0...10]
    }`

  // Fetch the related songs data
  return fetchSanity(query, false)
}

/**
 * Fetch content by a specific Railcontent ID.
 *
 * @param {string} id - The Railcontent ID of the content to fetch.
 * @param {string} contentType - The document type of content to fetch
 * @returns {Promise<Object|null>} - A promise that resolves to the content object or null if not found.
 *
 * @example
 * fetchByRailContentId('abc123')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function fetchByRailContentId(id, contentType) {
  const fields = await getFieldsForContentTypeWithFilteredChildren(contentType, true)
  const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()
  const entityFieldsString = ` ${fields}
      'child_count': coalesce(count(child[${childrenFilter}]->), 0) ,
      'length_in_seconds': coalesce(
      math::sum(
        select(
          child[${childrenFilter}]->length_in_seconds
        )
      ),
      length_in_seconds
    ),`

  const query = buildRawQuery(
    `railcontent_id == ${id} && _type == '${contentType}'`,
    entityFieldsString,
    {
      isSingle: true,
    }
  )

  return fetchSanity(query, false)
}

/**
 * Fetch content by an array of Railcontent IDs.
 *
 * @param {Array<string|number>} ids - The array of Railcontent IDs of the content to fetch.
 * @param {string} [contentType] - The content type the IDs to add needed fields to the response.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of content objects or null if not found.
 *
 * @example
 * fetchByRailContentIds(['abc123', 'def456', 'ghi789'])
 *   .then(contents => console.log(contents))
 *   .catch(error => console.error(error));
 */
export async function fetchByRailContentIds(
  ids,
  contentType = undefined,
  brand = undefined,
  includePermissionsAndStatusFilter = false,
  filterOptions = {}
) {
  if (!ids?.length) {
    return []
  }
  ids = [...new Set(ids.filter((item) => item !== null && item !== undefined))]
  const idsString = ids.join(',')
  const brandFilter = brand ? ` && brand == "${brand}"` : ''
  const lessonCountFilter = await new FilterBuilder(`_id in ^.child[]._ref`, {
    pullFutureContent: true,
  }).buildFilter()
  const fields = await getFieldsForContentTypeWithFilteredChildren(contentType, true)
  const baseFilter = `railcontent_id in [${idsString}]${brandFilter}`
  const finalFilter = includePermissionsAndStatusFilter
    ? await new FilterBuilder(baseFilter, filterOptions).buildFilter()
    : baseFilter
  const query = `*[
    ${finalFilter}
  ]{
    ${fields}
    'lesson_count': coalesce(count(*[${lessonCountFilter}]), 0),
    live_event_start_time,
    live_event_end_time,
  }`

  const customPostProcess = (results) => {
    const now = getSanityDate(new Date(), false)
    const liveProcess = (result) => {
      if (result.live_event_start_time && result.live_event_end_time) {
        result.isLive = result.live_event_start_time <= now && result.live_event_end_time >= now
      } else {
        result.isLive = false
      }
      return result
    }
    return results.map(liveProcess)
  }
  const results = await fetchSanity(query, true, {
    customPostProcess: customPostProcess,
    processNeedAccess: true,
  })

  const sortFuction = function compare(a, b) {
    const indexA = ids.indexOf(a['id'])
    const indexB = ids.indexOf(b['id'])
    if (indexA === indexB) return 0
    if (indexA > indexB) return 1
    return -1
  }

  // Sort results to match the order of the input IDs
  const sortedResults = results?.sort(sortFuction) ?? null
  return sortedResults
}

export async function fetchContentRows(brand, pageName, contentRowSlug) {
  if (pageName === 'lessons') pageName = 'lesson'
  if (pageName === 'songs') pageName = 'song'
  const rowString = contentRowSlug ? ` && slug.current == "${contentRowSlug.toLowerCase()}"` : ''
  const lessonCountFilter = await new FilterBuilder(`_id in ^.child[]._ref`, {
    pullFutureContent: true,
    showMembershipRestrictedContent: true,
  }).buildFilter()
  const childFilter = await new FilterBuilder('', {
    isChildrenFilter: true,
    showMembershipRestrictedContent: true,
  }).buildFilter()
  const query = `*[_type == 'recommended-content-row' && brand == '${brand}' && type == '${pageName}'${rowString}]{
    brand,
    name,
    'slug': slug.current,
    'content': content[${childFilter}]->{
        'children': child[${childFilter}]->{ 'id': railcontent_id,
          'type': _type, brand, 'thumbnail': thumbnail.asset->url,
          'children': child[${childFilter}]->{'id': railcontent_id}, },
        ${getFieldsForContentType('tab-data')}
        'lesson_count': coalesce(count(*[${lessonCountFilter}]), 0),
    },
  }`
  return fetchSanity(query, true, { processNeedAccess: true })
}

/**
 * Fetch all content for a specific brand and type with pagination, search, and grouping options.
 * @param {string} brand - The brand for which to fetch content.
 * @param {string} type - The content type to fetch (e.g., 'song', 'artist').
 * @param {Object} params - Parameters for pagination, filtering, sorting, and grouping.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {string} [params.searchTerm=""] - The search term to filter content by title or artist.
 * @param {string} [params.sort="-published_on"] - The field to sort the content by.
 * @param {Array<string>} [params.includedFields=[]] - The fields to include in the query.
 * @param {string} [params.groupBy=""] - The field to group the results by (e.g., 'artist', 'genre').
 * @param {Array<string>} [params.progressIds=undefined] - An array of railcontent IDs to filter the results by. Used for filtering by progress.
 * @param {boolean} [params.useDefaultFields=true] - use the default sanity fields for content Type
 * @param {Array<string>} [params.customFields=[]] - An array of sanity fields to include in the request
 * @param {string} [params.progress="all"] - An string representing which progress filter to use ("all", "in progress", "complete", "not started").
 * @returns {Promise<Object|null>} - The fetched content data or null if not found.
 *
 * @example
 * fetchAll('drumeo', 'song', {
 *   page: 2,
 *   limit: 20,
 *   searchTerm: 'jazz',
 *   sort: '-popularity',
 *   includedFields: ['difficulty,Intermediate'],
 *   groupBy: 'artist',
 *   progressIds: [123, 321],
 *   useDefaultFields: false,
 *   customFields: ['is_house_coach', 'slug.current', "'instructors': instructor[]->name"],
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function fetchAll(
  brand,
  type,
  {
    page = 1,
    limit = 10,
    searchTerm = '',
    sort = '-published_on',
    includedFields = [],
    groupBy = '',
    progressIds = undefined,
    useDefaultFields = true,
    customFields = [],
    progress = 'all',
    onlyPublished = true
  } = {}
) {
  let config = contentTypeConfig[type] ?? {}
  let additionalFields = config?.fields ?? []
  let isGroupByOneToOne = (groupBy ? config?.relationships?.[groupBy]?.isOneToOne : false) ?? false
  let webUrlPathType = config?.slug ?? type
  const start = (page - 1) * limit
  const end = start + limit
  let bypassStatusAndPublishedValidation =
    type == 'instructor' || groupBy == 'artist' || groupBy == 'genre' || groupBy == 'instructor'
  let bypassPermissions = bypassStatusAndPublishedValidation
  // Construct the type filter
  let typeFilter

  if (type === 'archives') {
    typeFilter = `&& status == "archived"`
    bypassStatusAndPublishedValidation = true
  } else if (type === 'lessons' || type === 'songs') {
    typeFilter = ``
  } else {
    typeFilter = type ? `&& _type == '${type}'` : ''
  }

  // Construct the search filter
  const searchFilter = searchTerm
    ? groupBy !== ''
      ? `&& (^.name match "${searchTerm}*" || title match "${searchTerm}*")`
      : `&& (artist->name match "${searchTerm}*" || instructor[]->name match "${searchTerm}*" || title match "${searchTerm}*" || name match "${searchTerm}*")`
    : ''

  // Construct the included fields filter, replacing 'difficulty' with 'difficulty_string'
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''

  // limits the results to supplied progressIds for started & completed filters
  const progressFilter = await getProgressFilter(progress, progressIds)

  // Determine the sort order
  const sortOrder = getSortOrder(sort, brand, groupBy)

  let fields = useDefaultFields
    ? customFields.concat(DEFAULT_FIELDS, additionalFields)
    : customFields
  let fieldsString = fields.join(',')

  let customFilter = ''
  if (type == 'instructor') {
    customFilter = '&& coach_card_image != null'
  }
  if (onlyPublished) {
    customFilter = ' && status == "published" '
  }
  // Determine the group by clause
  let query = ''
  let entityFieldsString = ''
  let filter = ''
  if (groupBy !== '' && isGroupByOneToOne) {
    const webUrlPath = 'artists'
    const lessonsFilter = `_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter} ${progressFilter} ${customFilter}`
    const lessonsFilterWithRestrictions = await new FilterBuilder(lessonsFilter).buildFilter()
    entityFieldsString = `
                'id': railcontent_id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'web_url_path': '/${brand}/${webUrlPath}/'+name+'?included_fieds[]=type,${type}',
                'all_lessons_count': count(*[${lessonsFilterWithRestrictions}]._id),
                'children': *[${lessonsFilterWithRestrictions}]{
                    ${fieldsString},
                    ${groupBy}
                }[0...20]
        `
    filter = `_type == '${groupBy}' && count(*[${lessonsFilterWithRestrictions}]._id) > 0`
  } else if (groupBy !== '') {
    const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()

    const webUrlPath = groupBy == 'genre' ? '/genres' : ''
    const lessonsFilter = `brand == '${brand}' && ^._id in ${groupBy}[]._ref ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter} ${customFilter}`
    const lessonsFilterWithRestrictions = await new FilterBuilder(lessonsFilter).buildFilter()

    entityFieldsString = `
                'id': railcontent_id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'web_url_path': select(defined(web_url_path)=> web_url_path +'?included_fieds[]=type,${type}',!defined(web_url_path)=> '/${brand}${webUrlPath}/'+name+'/${webUrlPathType}'),
                'all_lessons_count': count(*[${lessonsFilterWithRestrictions}]._id),
                'children': *[${lessonsFilterWithRestrictions}]{
                    ${fieldsString},
                     'lesson_count': coalesce(count(child[${childrenFilter}]->), 0) ,
                    ${groupBy}
                }[0...20]`
    filter = `_type == '${groupBy}' && count(*[${lessonsFilterWithRestrictions}]._id) > 0`
  } else {
    filter = `brand == "${brand}" ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter} ${customFilter}`
    const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()
    entityFieldsString = ` ${fieldsString},
      'lesson_count': coalesce(count(child[${childrenFilter}]->), 0) ,
      'length_in_seconds': coalesce(
      math::sum(
        select(
          child[${childrenFilter}]->length_in_seconds
        )
      ),
      length_in_seconds
    ),`
  }

  const filterWithRestrictions = await new FilterBuilder(filter, {
    bypassStatuses: bypassStatusAndPublishedValidation,
    bypassPermissions: bypassPermissions,
    bypassPublishedDateRestriction: bypassStatusAndPublishedValidation,
  }).buildFilter()
  query = buildEntityAndTotalQuery(filterWithRestrictions, entityFieldsString, {
    sortOrder: sortOrder,
    start: start,
    end: end,
  })

  return fetchSanity(query, true)
}

async function getProgressFilter(progress, progressIds) {
  switch (progress) {
    case 'all':
      return progressIds !== undefined ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
    case 'in progress': {
      const ids = await getAllStarted()
      return `&& railcontent_id in [${ids.join(',')}]`
    }
    case 'completed': {
      const ids = await getAllCompleted()
      return `&& railcontent_id in [${ids.join(',')}]`
    }
    case 'not started': {
      const ids = await getAllStartedOrCompleted()
      return `&& !(railcontent_id in [${ids.join(',')}])`
    }
    case 'recent': {
      const ids = progressIds !== undefined ? progressIds : await getAllStartedOrCompleted()
      return `&& (railcontent_id in [${ids.join(',')}])`
    }
    case 'incomplete': {
      const ids = progressIds !== undefined ? progressIds : await getAllStarted()
      return `&& railcontent_id in [${ids.join(',')}]`
    }
    default:
      throw new Error(`'${progress}' progress option not implemented`)
  }
}

/**
 * Fetches all available filter options based on brand, filters, and various optional criteria.
 *
 * This function constructs a query to retrieve the total number of results and filter options such as difficulty, instrument type, and genre.
 * The filter options are dynamically generated based on the provided filters, style, artist, and content type.
 * If a coachId is provided, the content type must be 'coach-lessons'.
 *
 * @param {string} brand - Brand to filter.
 * @param {string[]} filters - Key-value pairs to filter the query.
 * @param {string} [style] - Optional style/genre filter.
 * @param {string} [artist] - Optional artist name filter.
 * @param {string} contentType - Content type (e.g., 'song', 'lesson').
 * @param {string} [term] - Optional search term for title, album, artist, or genre.
 * @param {Array<string>} [progressIds] - Optional array of progress IDs to filter by.
 * @param {string} [coachId] - Optional coach ID (only valid if contentType is 'coach-lessons').
 * @param {boolean} [includeTabs=false] - Whether to include tabs in the returned metadata.
 * @returns {Promise<Object>} - The filter options and metadata.
 * @throws {Error} If coachId is provided but contentType isn't 'coach-lessons'.
 *
 * @example
 * // Fetch filter options for 'song' content type:
 * fetchAllFilterOptions('myBrand', [], 'Rock', 'John Doe', 'song', 'Love')
 *   .then(options => console.log(options))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Fetch filter options for a coach's lessons with coachId:
 * fetchAllFilterOptions('myBrand', [], 'Rock', 'John Doe', 'coach-lessons', 'Love', undefined, '123')
 *   .then(options => console.log(options))
 *   .catch(error => console.error(error));
 */
export async function fetchAllFilterOptions(
  brand,
  filters = [],
  style,
  artist,
  contentType,
  term,
  progressIds,
  coachId,
  includeTabs = false
) {
  if (contentType == 'lessons' || contentType == 'songs') {
    const metaData = processMetadata(brand, contentType, true)
    return {
      meta: metaData,
    }
  }

  if (coachId && contentType !== 'coach-lessons') {
    throw new Error(
      `Invalid contentType: '${contentType}' for coachId. It must be 'coach-lessons'.`
    )
  }

  const includedFieldsFilter = filters?.length ? filtersToGroq(filters) : undefined
  const progressFilter = progressIds ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const adapter = getPermissionsAdapter()
  const userPermissionsData = await adapter.fetchUserPermissions()
  const isAdmin = adapter.isAdmin(userPermissionsData)

  const constructCommonFilter = (excludeFilter) => {
    const filterWithoutOption = excludeFilter
      ? filtersToGroq(filters, excludeFilter)
      : includedFieldsFilter
    const statusFilter = ' && status == "published"'
    const includeStatusFilter = !isAdmin && !['instructor', 'artist', 'genre'].includes(contentType)

    return coachId
      ? `brand == '${brand}' && status == "published" && references(*[_type=='instructor' && railcontent_id == ${coachId}]._id) ${filterWithoutOption || ''} ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}`
      : `_type == '${contentType}' && brand == "${brand}"${includeStatusFilter ? statusFilter : ''}${style && excludeFilter !== 'style' ? ` && '${style}' in genre[]->name` : ''}${artist && excludeFilter !== 'artist' ? ` && artist->name == "${artist}"` : ''} ${progressFilter} ${filterWithoutOption || ''} ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}`
  }

  const metaData = processMetadata(brand, contentType, true)
  const allowableFilters = metaData?.allowableFilters || []
  const tabs = metaData?.tabs || []
  const catalogName = metaData?.shortname || metaData?.name

  const dynamicFilterOptions = allowableFilters
    .map((filter) => getFilterOptions(filter, constructCommonFilter(filter), contentType, brand))
    .join(' ')

  const query = `
      {
        "meta": {
          "totalResults": count(*[${constructCommonFilter()}
            ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}]),
          "filterOptions": {
            ${dynamicFilterOptions}
          }
      }
    }`

  const results = await fetchSanity(query, true, { processNeedAccess: false })

  return includeTabs ? { ...results, tabs, catalogName } : results
}

/**
 * Fetch the next piece of content under a parent by Railcontent ID
 * @param {int} railcontentId - The Railcontent ID of the parent content
 * @returns {Promise<{next: (Object|null)}|null>} - object with 'next' attribute
 * @example
 * jumpToContinueContent(296693)
 *  then.(data => { console.log('next', data.next);})
 *  .catch(error => console.error(error));
 */
export async function jumpToContinueContent(railcontentId) {
  const nextContent = await fetchNextContentDataForParent(railcontentId)
  if (!nextContent || !nextContent.id) {
    return null
  }
  let next = await fetchByRailContentId(nextContent.id, nextContent.type)
  return { next }
}

/**
 * Fetch the page data for a specific lesson by Railcontent ID.
 * @param {string} railContentId - The Railcontent ID of the current lesson.
 * @parent {boolean} addParent - Whether to include parent content data in the response.
 * @returns {Promise<Object|null>} - The fetched page data or null if found.
 *
 * @example
 * fetchLessonContent('lesson123')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchLessonContent(railContentId, { addParent = false } = {}) {
  const filterParams = {
    isSingle: true,
    pullFutureContent: true,
    showMembershipRestrictedContent: true,
  }

  const parentQuery = addParent
    ? `"parent_content_data": *[railcontent_id in [...(^.parent_content_data[].id)]]{
      "id": railcontent_id,
      title,
      slug,
      "type": _type,
      "logo" : logo_image_url.asset->url,
      "dark_mode_logo": dark_mode_logo_url.asset->url,
      "light_mode_logo": light_mode_logo_url.asset->url,
      "badge": ${contentAwardField}.badge.asset->url,
      "badge_rear": ${contentAwardField}.badge_rear.asset->url,
      "badge_logo": ${contentAwardField}.logo.asset->url,
    },`
    : ''

  const fields = `${getFieldsForContentType()}
    "resources": ${resourcesField},
    soundslice,
    instrumentless,
    soundslice_slug,
    "description": ${descriptionField},
    "chapters": ${chapterField},
    "instructors":instructor[]->name,
    "instructor": ${instructorField},
    ${assignmentsField}
    video,
    "length_in_seconds": coalesce(soundslice[0].soundslice_length_in_second, length_in_seconds),
    mp3_no_drums_no_click_url,
    mp3_no_drums_yes_click_url,
    mp3_yes_drums_no_click_url,
    mp3_yes_drums_yes_click_url,
    "permission_id": permission_v2,
    ${parentQuery}
    ...select(
      defined(live_event_start_time) => {
        live_event_start_time,
        live_event_end_time,
        live_event_stream_id,
        "vimeo_live_event_id": vimeo_live_event_id,
        "videoId": coalesce(live_event_stream_id, video.external_id),
        "live_event_is_global": live_global_event == true
      }
    )
  `

  const query = await buildQuery(`railcontent_id == ${railContentId}`, filterParams, fields, {
    isSingle: true,
  })
  const chapterProcess = (result) => {
    const now = getSanityDate(new Date(), false)
    if (result.live_event_start_time && result.live_event_end_time) {
      result.isLive = result.live_event_start_time <= now && result.live_event_end_time >= now
    }
    const chapters = result.chapters ?? []
    if (chapters.length === 0) return result
    result.chapters = chapters.map((chapter, index) => ({
      ...chapter,
      chapter_thumbnail_url: `https://musora-web-platform.s3.amazonaws.com/chapters/${result.brand}/Chapter${index + 1}.jpg`,
    }))
    return result
  }

  let contents = await fetchSanity(query, false, { customPostProcess: chapterProcess, processNeedAccess: true })
  contents = addAwardTemplateToContent(contents)

  return contents
}

/**
 * Returns a list of recommended content based on the provided railContentId.
 * If no recommendations found in recsys, falls back to fetching related lessons.
 *
 * @param railContentId
 * @param brand
 * @param count
 * @returns {Promise<Array<Object>>}
 */
export async function fetchRelatedRecommendedContent(railContentId, brand, count = 10) {
  const recommendedItems = await fetchSimilarItems(railContentId, brand, count)
  if (recommendedItems && recommendedItems.length > 0) {
    return fetchByRailContentIds(recommendedItems, 'tab-data', brand, true)
  }

  return await fetchRelatedLessons(railContentId, brand).then((result) =>
    result.related_lessons?.splice(0, count)
  )
}

/**
 * Get song type (transcriptions, jam packs, play alongs, tutorial children) content documents that share content information with the provided railcontent document.
 * These are linked through content that shares a license with the provided railcontent document
 *
 * @param railcontentId
 * @param brand
 * @param count
 * @returns {Promise<Array<Object>>}
 */
export async function fetchOtherSongVersions(railcontentId, brand, count = 3) {
  return fetchRelatedByLicense(railcontentId, brand, true, count)
}

/**
 * Get non-song content documents that share content information with the provided railcontent document.
 * These are linked through content that shares a license with the provided railcontent document
 *
 * @param {integer} railcontentId
 * @param {string} brand
 * @param {integer:3} count
 * @returns {Promise<Array<Object>>}
 */
export async function fetchLessonsFeaturingThisContent(railcontentId, brand, count = 3) {
  return fetchRelatedByLicense(railcontentId, brand, false, count)
}

/**
 * Get content documents that share license information with the provided railcontent id
 *
 * @param {integer} railcontentId
 * @param {string} brand
 * @param {boolean} onlyUseSongTypes - if true, only return the song type documents. If false, return everything except those
 * @param {integer:3} count
 * @returns {Promise<Array<Object>>}
 */
async function fetchRelatedByLicense(railcontentId, brand, onlyUseSongTypes, count) {
  const typeCheck = `@->_type in [${arrayJoinWithQuotes(SONG_TYPES)}]`
  let typeCheckString = `@->brand == '${brand}' && `
  typeCheckString += onlyUseSongTypes ? `${typeCheck}` : `!(${typeCheck})`
  const contentFromLicenseFilter = `_type == 'license' && references(^._id)].content[${typeCheckString} && @->railcontent_id != ${railcontentId}`
  let filterSongTypesWithSameLicense = await new FilterBuilder(contentFromLicenseFilter, {
    isChildrenFilter: true,
  }).buildFilter()
  let queryFields = getFieldsForContentType()
  const baseParentQuery = `railcontent_id == ${railcontentId}`
  let parentQuery = await new FilterBuilder(baseParentQuery).buildFilter()

  // queryFields = 'railcontent_id, title'
  // parentQuery = baseParentQuery
  // filterSongTypesWithSameLicense = contentFromLicenseFilter
  const query = `*[${parentQuery}]{
   _type, railcontent_id,
      "related_by_license" :
          *[${filterSongTypesWithSameLicense}]->{${queryFields}}|order(published_on desc, title asc)[0...${count}],
      }[0...1]`
  const results = await fetchSanity(query, false)
  return results ? (results['related_by_license'] ?? []) : []
}

/**
 * Fetch sibling lessons to a specific lesson
 * @param {string} railContentId - The RailContent ID of the current lesson.
 * @param {string} brand - The current brand.
 * @returns {Promise<Array<Object>|null>} - The fetched related lessons data or null if not found.
 */
export async function fetchSiblingContent(railContentId, brand = null) {
  const filterGetParent = await new FilterBuilder(`references(^._id) && _type == ^.parent_type`, {
    pullFutureContent: true,
    showMembershipRestrictedContent: true, // Show parent even without permissions
  }).buildFilter()
  const filterForParentList = await new FilterBuilder(
    `references(^._id) && _type == ^.parent_type`,
    {
      pullFutureContent: true,
      isParentFilter: true,
      showMembershipRestrictedContent: true, // Show parent even without permissions
    }
  ).buildFilter()

  const childrenFilter = await new FilterBuilder(``, {
    isChildrenFilter: true,
    showMembershipRestrictedContent: true, // Show all lessons in sidebar, need_access applied on individual page
  }).buildFilter()

  const brandString = brand ? ` && brand == "${brand}"` : ''
  const queryFields = `_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail":thumbnail.asset->url, length_in_seconds, status, "type": _type, difficulty, difficulty_string, artist->, "permission_id": permission_v2, "genre": genre[]->name, "parent_id": parent_content_data[0].id`

  const query = `*[railcontent_id == ${railContentId}${brandString}]{
   _type, parent_type, 'parent_id': parent_content_data[0].id, railcontent_id,
   'for-calculations': *[${filterGetParent}][0]{
    'siblings-list': child[]->railcontent_id,
    'parents-list': *[${filterForParentList}][0].child[]->railcontent_id
    },
    "related_lessons" : *[${filterGetParent}][0].child[${childrenFilter}]->{${queryFields}}
  }`

  let result = await fetchSanity(query, false, { processNeedAccess: true })

  //there's no way in sanity to retrieve the index of an array, so we must calculate after fetch
  if (result['for-calculations'] && result['for-calculations']['parents-list']) {
    const calc = result['for-calculations']
    const parentCount = calc['parents-list'].length
    const currentParentIndex = calc['parents-list'].indexOf(result['parent_id']) + 1
    const siblingCount = calc['siblings-list'].length
    const currentSiblingIndex = calc['siblings-list'].indexOf(result['railcontent_id']) + 1

    delete result['for-calculations']
    result = { ...result, parentCount, currentParentIndex, siblingCount, currentSiblingIndex }
    return result
  } else {
    delete result['for-calculations']
    return result
  }
}

/**
 * Fetch lessons related to a specific lesson by RailContent ID and type.
 * @param {string} railContentId - The RailContent ID of the current lesson.
 * @returns {Promise<Array<Object>|null>} - The fetched related lessons data or null if not found.
 */
export async function fetchRelatedLessons(railContentId) {
  const defaultFilterFields = `_type==^._type && brand == ^.brand && railcontent_id != ${railContentId}`

  const filterSameArtist = await new FilterBuilder(
    `${defaultFilterFields} && references(^.artist->_id)`,
    { showMembershipRestrictedContent: true }
  ).buildFilter()
  const filterSameGenre = await new FilterBuilder(
    `${defaultFilterFields} && references(^.genre[]->_id)`,
    { showMembershipRestrictedContent: true }
  ).buildFilter()

  const queryFields = `_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail":thumbnail.asset->url, length_in_seconds, status, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission_v2,_type, "genre": genre[]->name`

  const query = `*[railcontent_id == ${railContentId} && (!defined(permission) || references(*[_type=='permission']._id))]{
   _type, parent_type, railcontent_id,
    "related_lessons" : array::unique([
      ...(*[${filterSameArtist}]{${queryFields}}|order(published_on desc, title asc)[0...10]),
      ...(*[${filterSameGenre}]{${queryFields}}|order(published_on desc, title asc)[0...10]),
      ])[0...10]}`

  return await fetchSanity(query, false, { processNeedAccess: true })
}

export async function fetchLiveEvent(brand, forcedContentId = null) {
  const LIVE_EXTRA_MINUTES = 30
  //calendarIDs taken from addevent.php
  // TODO import instructor calendars to Sanity
  let defaultCalendarID = ''
  switch (brand) {
    case 'drumeo':
      defaultCalendarID = 'GP142387'
      break
    case 'pianote':
      defaultCalendarID = 'be142408'
      break
    case 'guitareo':
      defaultCalendarID = 'IJ142407'
      break
    case 'singeo':
      defaultCalendarID = 'bk354284'
      break
    default:
      break
  }
  let startDateTemp = new Date()
  let endDateTemp = new Date()

  startDateTemp = new Date(
    startDateTemp.setMinutes(startDateTemp.getMinutes() + LIVE_EXTRA_MINUTES)
  )
  endDateTemp = new Date(endDateTemp.setMinutes(endDateTemp.getMinutes() - LIVE_EXTRA_MINUTES))

  const liveEventFields = liveFields + `, 'event_coach_calendar_id': coalesce(calendar_id, '${defaultCalendarID}')`

  const baseFilter =
    forcedContentId !== null
      ? `railcontent_id == ${forcedContentId}`
      : `status == 'scheduled'
      && (brand == '${brand}' || live_global_event == true)
      && defined(live_event_start_time)
      && live_event_start_time <= '${getSanityDate(startDateTemp, false)}'
      && live_event_end_time >= '${getSanityDate(endDateTemp, false)}'`

  const filter = await new FilterBuilder(baseFilter, {bypassPermissions: true}).buildFilter()

  // This query finds the first scheduled event (sorted by start_time) that ends after now()
  const query = `*[${filter}]{${liveEventFields}} | order(live_event_start_time)[0...1]`

  return await fetchSanity(query, false, { processNeedAccess: false })
}

/**
 * Fetch the data needed for the CourseCollection Overview screen.
 * @param {number} id - The Railcontent ID of the CourseCollection
 * @returns {Promise<Object|null>} - The CourseCollection information and lessons or null if not found.
 *
 * @example
 * fetchCourseCollectionData(404048)
 *   .then(CourseCollection => console.log(CourseCollection))
 *   .catch(error => console.error(error));
 */
export async function fetchCourseCollectionData(id) {
  const builder = await new FilterBuilder(`railcontent_id == ${id}`).buildFilter()
  const query = `*[${builder}]{
    ${await getFieldsForContentTypeWithFilteredChildren('course-collection')}
  } [0...1]`
  return fetchSanity(query, false)
}

/**
 * DEPRECATED: Use fetchCourseCollectionData
 * Fetch the data needed for the Pack Overview screen.
 * @param {number} id - The Railcontent ID of the pack
 * @returns {Promise<Object|null>} - The pack information and lessons or null if not found.
 *
 * @example
 * fetchPackData(404048)
 *   .then(pack => console.log(pack))
 *   .catch(error => console.error(error));
 */
export async function fetchPackData(id) {
  return fetchCourseCollectionData(id)
}

/**
 * Fetch the data needed for the coach screen.
 * @param {string} id - The Railcontent ID of the coach
 *
 * @returns {Promise<Object|null>} - The lessons for the instructor or null if not found.
 *
 * @example
 * fetchCoachLessons('coach123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchByReference(
  brand,
  { sortOrder = '-published_on', searchTerm = '', page = 1, limit = 20, includedFields = [] } = {}
) {
  const fieldsString = getFieldsForContentType()
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? includedFields.join(' && ') : ''

  const filter = `brand == '${brand}' ${searchFilter} && references(*[${includedFieldsFilter}]._id)`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()
  const query = buildEntityAndTotalQuery(filterWithRestrictions, fieldsString, {
    sortOrder: getSortOrder(sortOrder, brand),
    start: start,
    end: end,
  })
  return fetchSanity(query, true)
}

/**
 *
 * Return the top level parent content railcontent_id.
 * Ignores learning-path-v2 parents.
 * ex: if railcontentId is of type 'skill-pack-lesson', return the corresponding 'skill-pack' railcontent_id
 *
 * @param {int} railcontentId
 * @returns {Promise<int|null>}
 */
export async function fetchTopLevelParentId(railcontentId) {
  const parentFilter = 'railcontent_id in [...(^.parent_content_data[].id)]'
  const statusFilter = "&& status in ['scheduled', 'published', 'archived', 'unlisted']"

  const query = `*[railcontent_id == ${railcontentId}]{
      railcontent_id,
      'parents': *[${parentFilter} ${statusFilter}]{
        railcontent_id
      }
    }`
  let response = await fetchSanity(query, false, { processNeedAccess: false })
  if (!response) return null
  let parents = response['parents']
  let parentsLength = parents ? response['parents'].length : 0
  if (parentsLength > 0) {
    // return the last parent
    return parents[parentsLength - 1]['railcontent_id']
  }
  return response['railcontent_id']
}

export async function fetchLearningPathHierarchy(railcontentId, collection) {
  if (!collection) {
    return null
  }

  const topLevelId = collection.id

  let response = await fetchByRailContentId(topLevelId, collection.type)
  if (!response) return null

  let data = {
    topLevelId: topLevelId,
    parents: {},
    children: {},
  }
  populateHierarchyLookups(response, data, null)
  return data
}

export async function fetchHierarchy(railcontentId) {
  let topLevelId = await fetchTopLevelParentId(railcontentId)
  const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()
  const query = `*[railcontent_id == ${topLevelId}]{
      railcontent_id,
      'assignments': assignment[]{railcontent_id},
      'children': child[${childrenFilter}]->{
        railcontent_id,
        'assignments': assignment[]{railcontent_id},
        'children': child[${childrenFilter}]->{
            railcontent_id,
            'assignments': assignment[]{railcontent_id},
            'children': child[${childrenFilter}]->{
               railcontent_id,
               'assignments': assignment[]{railcontent_id},
               'children': child[${childrenFilter}]->{
                  railcontent_id,
            }
          }
        }
      },
    }`
  let response = await fetchSanity(query, false, { processNeedAccess: false })
  if (!response) return null
  let data = {
    topLevelId: topLevelId,
    parents: {},
    children: {},
  }
  populateHierarchyLookups(response, data, null)
  return data
}

function populateHierarchyLookups(currentLevel, data, parentId) {
  const railcontentIdField = currentLevel.railcontent_id ? 'railcontent_id' : 'id'

  let contentId = currentLevel[railcontentIdField]
  let children = currentLevel['children']

  data.parents[contentId] = parentId
  if (children) {
    data.children[contentId] = children.map((child) => child[railcontentIdField])
    for (let i = 0; i < children.length; i++) {
      populateHierarchyLookups(children[i], data, contentId)
    }
  } else {
    data.children[contentId] = []
  }

  let assignments = currentLevel['assignments']
  if (assignments) {
    let assignmentIds = assignments.map((assignment) => assignment[railcontentIdField])
    data.children[contentId] = (data.children[contentId] ?? []).concat(assignmentIds)
    assignmentIds.forEach((assignmentId) => {
      data.parents[assignmentId] = contentId
    })
  }
}

/**
 * Fetch data for comment mod page
 *
 * @param {array} ids - List of ids get data for
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the data
 */
export async function fetchCommentModContentData(ids) {
  const idsString = ids.join(',')
  const fields = `"id": railcontent_id, "type": _type, title, "url": web_url_path, "parent": *[^._id in child[]._ref]{"id": railcontent_id, title}`
  const query = await buildQuery(
    `railcontent_id in [${idsString}]`,
    { bypassPermissions: true },
    fields,
    { end: 50 }
  )
  let data = await fetchSanity(query, true)
  let mapped = {}
  data.forEach(function (content) {
    mapped[content.id] = {
      id: content.id,
      type: content.type,
      title: content.title,
      url: content.url,
      parentTitle: content.parent[0]?.title ?? null,
    }
  })
  return mapped
}

/**
 * Fetch shows data for a brand.
 *
 * @param brand - The brand for which to fetch shows.
 * @returns {Promise<{name, description, type: *, thumbnailUrl}>}
 *
 *  @example
 *
 * fetchShowsData('drumeo')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchShowsData(brand) {
  let shows = showsTypes[brand] ?? []
  const showsInfo = []

  shows.forEach((type) => {
    const processedData = processMetadata(brand, type)
    if (processedData) showsInfo.push(processedData)
  })

  return showsInfo
}

/**
 * Fetch metadata from the contentMetaData.js based on brand and type.
 * For v2 you need to provide page type('lessons' or 'songs') in type parameter
 *
 * @param {string} brand - The brand for which to fetch metadata.
 * @param {string} type - The type for which to fetch metadata.
 * @param {Object|boolean} [options={}] - Options object or legacy boolean for withFilters
 * @param {boolean} [options.skipTabFiltering=false] - Skip dynamic tab filtering (internal use)
 * @returns {Promise<{name, description, type: *, thumbnailUrl}>}
 *
 * @example
 * // Standard usage (with tab filtering)
 * fetchMetadata('drumeo', 'lessons')
 *
 * @example
 * // Internal usage (skip tab filtering to prevent recursion)
 * fetchMetadata('drumeo', 'lessons', { skipTabFiltering: true })
 */
export async function fetchMetadata(brand, type, options = {}) {
  // Handle backward compatibility - type was previously the 3rd param (boolean)
  const withFilters = typeof options === 'boolean' ? options : true
  const skipTabFiltering = options.skipTabFiltering || false
  let processedData = processMetadata(brand, type, withFilters)

  if (processedData?.onlyAvailableTabs === true) {
    const activeTabs = await fetchRecentActivitiesActiveTabs()
    processedData.tabs = activeTabs
  }

  if ((type === 'lessons' || type === 'songs') && !skipTabFiltering) {
    try {
      // Single API call to get all content type counts
      const contentTypeCounts = await fetchContentTypeCounts(brand, type)

      // Filter tabs based on counts
      processedData.tabs = filterTabsByContentCounts(processedData.tabs, contentTypeCounts)

      // Filter Type options based on counts
      if (processedData.filters) {
        processedData.filters = filterTypeOptionsByContentCounts(
          processedData.filters,
          contentTypeCounts
        )
      }
    } catch (error) {
      console.error('Error fetching content type counts, using all tabs/filters:', error)
      // Fail open - show all tabs and filters
    }
  }
  return processedData ? processedData : {}
}

export async function fetchChatAndLiveEnvent(brand, forcedId = null) {
  const liveEvent =
    forcedId !== null ? await fetchByRailContentIds([forcedId]) : [await fetchLiveEvent(brand)]
  if (liveEvent.length === 0 || (liveEvent.length === 1 && liveEvent[0] === undefined)) {
    return null
  }
  let url = `/content/live-chat?brand=${brand}`
  const chatData = await GET(url)

  return { ...chatData, ...liveEvent[0] }
}

// V2 methods

export async function fetchTabData(
  brand,
  pageName,
  {
    page = 1,
    limit = 10,
    sort = '-published_on',
    includedFields = [],
    progressIds = undefined,
    progress = 'all',
    showMembershipRestrictedContent = false,
    excludeIds = [],
  } = {}
) {
  const start = (page - 1) * limit
  const end = start + limit
  // Construct the included fields filter, replacing 'difficulty' with 'difficulty_string'
  const includedFieldsFilter =
    includedFields.length > 0 ? filtersToGroq(includedFields, [], pageName) : ''

  let sortOrder = getSortOrder(sort, brand, '')

  switch (progress) {
    case 'recent':
      progressIds = await getAllStartedOrCompleted({ brand, onlyIds: true })
      sortOrder = null
      break
    case 'incomplete':
      progressIds = await getAllStarted()
      sortOrder = null
      break
    case 'completed':
      progressIds = await getAllCompleted()
      sortOrder = null
      break
  }

  // limits the results to supplied progressIds for started & completed filters
  const progressFilter = await getProgressFilter(progress, progressIds)
  const fieldsString = getFieldsForContentType('tab-data')
  const now = getSanityDate(new Date())

  // Determine the group by clause
  let query = ''
  let entityFieldsString = ''
  let filter = ''

  const excludedIdsFilter = excludeIds.length
    ? `&& !(railcontent_id in [${excludeIds.join(',')}])`
    : ''

  const excludeCoursesInCourseCollectionsFilter = `&& !(_type == 'course' && defined(parent_content_data))`

  filter = `brand == "${brand}" && (defined(railcontent_id)) ${includedFieldsFilter} ${progressFilter} ${excludedIdsFilter} ${excludeCoursesInCourseCollectionsFilter}`
  const childrenFilter = await new FilterBuilder(``, {
    isChildrenFilter: true,
    showMembershipRestrictedContent: true,
  }).buildFilter()
  const childrenFields = await getChildFieldsForContentType('tab-data')
  const lessonCountFilter = await new FilterBuilder(`_id in ^.child[]._ref`).buildFilter()
  entityFieldsString = ` ${fieldsString}
    'children': child[${childrenFilter}]->{ ${childrenFields} 'children': child[${childrenFilter}]->{ ${childrenFields} }, },
    'isLive': live_event_start_time <= "${now}" && live_event_end_time >= "${now}",
    'lesson_count': coalesce(count(*[${lessonCountFilter}]), 0),
    'length_in_seconds': coalesce(
      math::sum(
        select(
          child[${childrenFilter}]->length_in_seconds
        )
      ),
      length_in_seconds
    ),`

  // Check if user is admin to determine available content statuses
  const adapter = getPermissionsAdapter()
  const userData = await adapter.fetchUserPermissions()
  const isAdminORModerator = adapter.isAdmin(userData) || adapter.isModerator(userData)

  const filterWithRestrictions = await new FilterBuilder(filter, {
    showMembershipRestrictedContent: true,
    availableContentStatuses: isAdminORModerator
      ? CONTENT_STATUSES.ADMIN_ALL
      : CONTENT_STATUSES.PUBLISHED_ONLY,
    pullFutureContent: isAdminORModerator ? true : false,
  }).buildFilter()
  query = buildEntityAndTotalQuery(filterWithRestrictions, entityFieldsString, {
    sortOrder: sortOrder,
    start: start,
    end: end,
  })

  let results = await fetchSanity(query, true, { processNeedAccess: true })

  if (['recent', 'incomplete', 'completed'].includes(progress) && results.entity.length > 1) {
    const orderMap = new Map(progressIds.map((id, index) => [id, index]))
    results.entity = results.entity
      .sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
        return aIdx - bIdx || new Date(b.published_on) - new Date(a.published_on)
      })
      .slice(start, end)
  }

  return results
}

export async function fetchRecent(
  brand,
  pageName,
  { page = 1, limit = 10, sort = '-published_on', includedFields = [], progress = 'recent' } = {}
) {
  const mergedIncludedFields = [...includedFields, `tab,all`]
  const results = await fetchTabData(brand, pageName, {
    page,
    limit,
    sort,
    includedFields: mergedIncludedFields,
    progress: progress.toLowerCase(),
  })
  return results.entity
}

export async function fetchShows(brand, type, sort = 'sort') {
  const sortOrder = getSortOrder(sort, brand)
  const filter = `_type == '${type}'  && brand == '${brand}'`
  const filterParams = {}

  const query = await buildQuery(filter, filterParams, getFieldsForContentType(type), {
    sortOrder: sortOrder,
    end: 100, // Adrian: added for homepage progress rows, this should be handled gracefully
  })
  return fetchSanity(query, true)
}

/**
 * Fetch the method intro video for a given brand.
 * @param brand
 * @returns {Promise<*|null>}
 */
export async function fetchMethodV2IntroVideo(brand) {
  const type = 'method-intro'
  const filter = `_type == '${type}' && brand == '${brand}'`
  const fields = getIntroVideoFields('method-v2')

  const query = `*[${filter}] { ${fields.join(', ')} }`
  return fetchSanity(query, false)
}

/**
 * Fetch the structure (just ids) of the Method for a given brand.
 * @param brand
 * @returns {Promise<*|null>}
 */
export async function fetchMethodV2Structure(brand) {
  const _type = 'method-v2'
  const query = `*[_type == '${_type}' && brand == '${brand}'][0...1]{
    'sanity_id': _id,
    brand,
    'intro_video_id': intro_video->railcontent_id,
    'learning_paths': child[]->{
      'id': railcontent_id,
      'intro_video_id': intro_video->railcontent_id,
      'children': child[]->railcontent_id
    }
  }`
  return await fetchSanity(query, false)
}

/**
 * Fetch the structure (just ids) of the Method of a given learning path or learning path lesson.
 * @param contentId
 * @returns {Promise<*|null>}
 */
export async function fetchMethodV2StructureFromId(contentId) {
  const _type = 'method-v2'
  const query = `*[_type == '${_type}' && brand == *[railcontent_id == ${contentId}][0].brand][0...1]{
    'sanity_id': _id,
    brand,
    'intro_video_id': intro_video->railcontent_id,
    'learning_paths': child[]->{
      'id': railcontent_id,
      'intro_video_id': intro_video->railcontent_id,
      'children': child[]->railcontent_id
    }
  }`
  return await fetchSanity(query, false)
}

/**
 * Fetch content owned by the user (excluding membership content).
 * Shows only content accessible through purchases/entitlements, not through membership.
 *
 * @param {string} brand - The brand to filter content by
 * @param {Object} options - Fetch options
 * @param {Array<string>} options.type - Content type(s) to filter (optional array, default: [])
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.sort - Sort field and direction (default: '-published_on')
 * @returns {Promise<Object>} Object with 'entity' (content array) and 'total' (count)
 */
export async function fetchOwnedContent(
  brand,
  { type = [], page = 1, limit = 10, sort = '-published_on' } = {}
) {
  const start = (page - 1) * limit
  const end = start + limit

  // Determine the sort order
  const sortOrder = getSortOrder(sort, brand)

  // Build the type filter
  let typeFilter = ''
  if (type.length > 0) {
    const typesString = type.map((t) => `'${t}'`).join(', ')
    typeFilter = `&& _type in [${typesString}]`
  }

  // Build the base filter
  const filter = `brand == "${brand}" ${typeFilter}`

  // Apply owned content filter
  const filterWithRestrictions = await new FilterBuilder(filter, {
    showOnlyOwnedContent: true, // Key parameter: exclude membership content
  }).buildFilter()

  // Use 'tab-data' to include children field (needed for navigateTo calculation)
  const fieldsString = await getFieldsForContentTypeWithFilteredChildren('tab-data', true)

  const query = buildEntityAndTotalQuery(filterWithRestrictions, fieldsString, {
    sortOrder: sortOrder,
    start: start,
    end: end,
  })

  return fetchSanity(query, true)
}

/**
 * Fetch brands for given content IDs.
 *
 * @param {Array<number>} contentIds - Array of railcontent IDs
 * @returns {Promise<Object>} - A promise that resolves to an object mapping content IDs to brands
 */
export async function fetchBrandsByContentIds(contentIds) {
  if (!contentIds || contentIds.length === 0) {
    return {}
  }
  const idsString = contentIds.join(',')
  const query = `*[railcontent_id in [${idsString}]]{
      railcontent_id,
      brand
    }`
  const results = await fetchSanity(query, true)
  const brandMap = {}
  results.forEach((item) => {
    brandMap[item.railcontent_id] = item.brand
  })
  return brandMap
}

/**
 * Get all possible content types for a page type (lessons or songs).
 * Returns unique array of Sanity content type strings.
 * Uses the existing filterTypes mapping from contentTypeConfig.
 *
 * @param {string} pageName - Page name ('lessons' or 'songs')
 * @returns {string[]} - Array of content type strings
 *
 * @example
 * getAllContentTypesForPage('lessons')
 * // Returns: ['lesson', 'quick-tips', 'course', 'guided-course', ...]
 */
function getAllContentTypesForPage(pageName) {
  return filterTypes[pageName] || []
}

/**
 * Fetch counts for all content types on a page (lessons/songs) in a single query.
 * Uses GROQ aggregation to efficiently get counts for multiple content types.
 * Only returns types with count > 0.
 *
 * @param {string} brand - Brand identifier (e.g., 'drumeo', 'playbass')
 * @param {string} pageName - Page name ('lessons' or 'songs')
 * @returns {Promise<Object.<string, number>>} - Object mapping content types to counts
 *
 * @example
 * await fetchContentTypeCounts('playbass', 'lessons')
 * // Returns: { 'guided-course': 45, 'skill-pack': 12, 'special': 8 }
 */
export async function fetchContentTypeCounts(brand, pageName) {
  const allContentTypes = getAllContentTypesForPage(pageName)

  if (allContentTypes.length === 0) {
    return {}
  }

  // Build array of type objects for GROQ query
  const typesString = allContentTypes.map((type) => `{"type": "${type}"}`).join(', ')

  const query = `{
    "typeCounts": [${typesString}]{
      type,
      'count': count(*[
        _type == ^.type
        && brand == "${brand}"
        && status == "published"
      ])
    }[count > 0]
  }`

  const results = await fetchSanity(query, true, { processNeedAccess: false })

  // Convert array to object for easier lookup: { 'guided-course': 45, ... }
  const countsMap = {}
  if (results.typeCounts) {
    results.typeCounts.forEach((item) => {
      countsMap[item.type] = item.count
    })
  }

  return countsMap
}

/**
 * Filter tabs based on which content types have content.
 * Always keeps 'For You' and 'Explore All' tabs.
 *
 * @param {Array} tabs - Array of tab objects from metadata
 * @param {Object.<string, number>} contentTypeCounts - Content type counts
 * @returns {Array} - Filtered array of tabs with content
 */
function filterTabsByContentCounts(tabs, contentTypeCounts) {
  return tabs.filter((tab) => {
    if (ALWAYS_VISIBLE_TABS.some((visibleTab) => visibleTab.name === tab.name)) {
      return true
    }

    const tabContentTypes = TAB_TO_CONTENT_TYPES[tab.name] || []

    if (tabContentTypes.length === 0) {
      // Unknown tab - show it to be safe
      console.warn(`Unknown tab "${tab.name}" - showing by default`)
      return true
    }

    // Tab has content if ANY of its content types have count > 0
    return tabContentTypes.some((type) => contentTypeCounts[type] > 0)
  })
}

/**
 * Filter Type filter options based on content type counts.
 * Removes parent/child options that have no content available.
 * Returns a new filters array (does not mutate original).
 *
 * @param {Array} filters - Filter groups array from metadata
 * @param {Object.<string, number>} contentTypeCounts - Content type counts
 * @returns {Array} - Filtered filter groups
 */
function filterTypeOptionsByContentCounts(filters, contentTypeCounts) {
  return filters
    .map((filter) => {
      // Only process Type filter
      if (filter.key !== 'type') {
        return filter
      }

      const filteredItems = filter.items
        .map((item) => {
          // For hierarchical filters (parent with children)
          if (item.isParent && item.items) {
            // Filter children based on their content types
            const availableChildren = item.items.filter((child) => {
              const childTypes = getContentTypesForFilterName(child.name)

              if (!childTypes || childTypes.length === 0) {
                console.warn(`Unknown filter child "${child.name}" - showing by default`)
                return true
              }

              // Child has content if ANY of its types have count > 0
              return childTypes.some((type) => contentTypeCounts[type] > 0)
            })

            // Keep parent only if it has available children
            if (availableChildren.length > 0) {
              // Return NEW object to avoid mutation
              return { ...item, items: availableChildren }
            }
            return null
          }

          // For flat items (no children)
          const itemTypes = getContentTypesForFilterName(item.name)

          if (!itemTypes || itemTypes.length === 0) {
            console.warn(`Unknown filter item "${item.name}" - showing by default`)
            return item
          }

          // Item has content if ANY of its types have count > 0
          const hasContent = itemTypes.some((type) => contentTypeCounts[type] > 0)
          return hasContent ? item : null
        })
        .filter(Boolean) // Remove nulls

      // Return new filter object with filtered items
      return {
        ...filter,
        items: filteredItems,
      }
    })
    .filter((filter) => {
      if (filter.key === 'type' && filter.items.length === 0) {
        return false
      }
      return true
    })
}

/**
 * Maps a display name to its corresponding content types from lessonTypesMapping.
 * @param {string} displayName - The display name from filter metadata
 * @returns {string[]|undefined} - Array of content types or undefined if not found
 */
function getContentTypesForFilterName(displayName) {
  const displayNameToKey = {
    Lessons: 'lessons',
    'Practice Alongs': 'practice alongs',
    'Live Archives': 'live archives',
    'Student Archives': 'student archives',
    Courses: 'courses',
    'Guided Courses': 'guided courses',
    'Course Collections': 'course collections',
    Specials: 'specials',
    Documentaries: 'documentaries',
    Shows: 'shows',
    'Skill Packs': 'skill packs',
    Tutorials: 'tutorials',
    Transcriptions: 'transcriptions',
    'Sheet Music': 'sheet music',
    Tabs: 'tabs',
    'Play-Alongs': 'play-alongs',
    'Jam Tracks': 'jam tracks',
  }

  const mappingKey = displayNameToKey[displayName]
  return mappingKey ? lessonTypesMapping[mappingKey] : undefined
}

// this is so we can export the inner function from mcs
export function getSongTypesFor(brand) {
  return getSongType(brand)
}

export function fetchParentChildRelationshipsFor(childIds, parentType) {
  const stringIds = childIds.join(',')
  const query = `*[_type == '${parentType}' && count(@.child[@->railcontent_id in [${stringIds}]]) > 0]{
  railcontent_id,
  "children": child[@->railcontent_id in [${stringIds}]]->railcontent_id
}`
  return fetchSanity(query, true)
}
