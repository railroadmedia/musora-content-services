/**
 * @module Sanity-Services
 */
import {
  artistOrInstructorName,
  instructorField,
  chapterField,
  assignmentsField,
  descriptionField,
  resourcesField,
  contentTypeConfig,
  getIntroVideoFields,
  DEFAULT_FIELDS,
  getFieldsForContentType,
  filtersToGroq,
  getUpcomingEventsTypes,
  showsTypes,
  getNewReleasesTypes,
  coachLessonsTypes,
  getFieldsForContentTypeWithFilteredChildren,
  getChildFieldsForContentType,
  SONG_TYPES,
  SONG_TYPES_WITH_CHILDREN,
} from '../contentTypeConfig.js'
import { fetchSimilarItems, recommendations } from './recommendations.js'
import { processMetadata, typeWithSortOrder } from '../contentMetaData.js'

import { globalConfig } from './config.js'

import { fetchNextContentDataForParent, fetchHandler } from './railcontent.js'
import { arrayToStringRepresentation, FilterBuilder } from '../filterBuilder.js'
import { getPermissionsAdapter } from './permissions/index.ts'
import { getAllCompleted, getAllStarted, getAllStartedOrCompleted } from './contentProgress.js'
import { fetchRecentActivitiesActiveTabs } from './userActivity.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['fetchRelatedByLicense']

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
    { pullFutureContent: false, availableContentStatuses: ['published'] },
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
    { pullFutureContent: true, availableContentStatuses: ['draft'] },
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
            "permission_id": permission[]->railcontent_id,
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
            "permission_id": permission[]->railcontent_id,
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
 * Fetch the latest new releases for a specific brand.
 * @param {string} brand - The brand for which to fetch new releases.
 * @returns {Promise<Object|null>} - The fetched new releases data or null if not found.
 */
export async function fetchNewReleases(
  brand,
  { page = 1, limit = 20, sort = '-published_on' } = {}
) {
  const newTypes = getNewReleasesTypes(brand)
  const typesString = arrayToStringRepresentation(newTypes)
  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder(sort, brand)
  const now = getDateOnly()
  const filter = `_type in ${typesString} && brand == '${brand}' && (status == 'published' && show_in_new_feed == true && published_on <= '${now}')`
  const fields = `
     "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "thumbnail": thumbnail.asset->url,
      ${artistOrInstructorName()},
      "artists": instructor[]->name,
      difficulty,
      difficulty_string,
      length_in_seconds,
      published_on,
      "type": _type,
      web_url_path,
      "permission_id": permission[]->railcontent_id,
      `
  const query = buildRawQuery(filter, fields, { sortOrder: sortOrder, start, end: end })
  return fetchSanity(query, true)
}

/**
 * Fetch upcoming events for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch upcoming events.
 * @returns {Promise<Object|null>} - A promise that resolves to an array of upcoming event objects or null if not found.
 *
 * @example
 * fetchUpcomingEvents('drumeo', {
 *   page: 2,
 *   limit: 20,
 * })
 *   .then(events => console.log(events))
 *   .catch(error => console.error(error));
 */
export async function fetchUpcomingEvents(brand, { page = 1, limit = 10 } = {}) {
  const now = getSanityDate(new Date())
  const start = (page - 1) * limit
  const end = start + limit
  const fields = `
        "id": railcontent_id,
        title,
        "image": thumbnail.asset->url,
        "thumbnail": thumbnail.asset->url,
        ${artistOrInstructorName()},
        "artists": instructor[]->name,
        difficulty,
        difficulty_string,
        length_in_seconds,
        published_on,
        "type": _type,
        web_url_path,
        "permission_id": permission[]->railcontent_id,
        live_event_start_time,
        live_event_end_time,
         "isLive": live_event_start_time <= '${now}' && live_event_end_time >= '${now}'`
  const query = buildRawQuery(
    `defined(live_event_start_time) && live_event_start_time >= '${now}' && (!defined(live_event_end_time) || live_event_end_time >= '${now}' ) && brand == '${brand}' &&  status == 'scheduled'`,
    fields,
    {
      sortOrder: 'published_on asc',
      start: start,
      end: end,
    }
  )
  return fetchSanity(query, true)
}

/**
 * Fetch scheduled releases for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch scheduled releasess.
 * @returns {Promise<Object|null>} - A promise that resolves to an array of scheduled release objects or null if not found.
 *
 * @example
 * fetchScheduledReleases('drumeo', {
 *   page: 2,
 *   limit: 20,
 * })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function fetchScheduledReleases(brand, { page = 1, limit = 10 }) {
  const upcomingTypes = getUpcomingEventsTypes(brand)
  const newTypes = getNewReleasesTypes(brand)

  const scheduledTypes = merge(upcomingTypes, newTypes)
  const typesString = arrayJoinWithQuotes(scheduledTypes)
  const now = getSanityDate(new Date())
  const start = (page - 1) * limit
  const end = start + limit
  const query = `*[_type in [${typesString}] && brand == '${brand}' && status in ['published','scheduled'] && (!defined(live_event_end_time) || live_event_end_time < '${now}' ) && published_on > '${now}']{
      "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "thumbnail": thumbnail.asset->url,
      ${artistOrInstructorName()},
      "artists": instructor[]->name,
      difficulty,
      difficulty_string,
      length_in_seconds,
      published_on,
      "type": _type,
      web_url_path,
      "permission_id": permission[]->railcontent_id,
  } | order(published_on asc)[${start}...${end}]`
  return fetchSanity(query, true)
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
  includePermissionsAndStatusFilter = false
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
    ? await new FilterBuilder(baseFilter).buildFilter()
    : baseFilter
  const query = `*[
    ${finalFilter}
  ]{
    ${fields}
    'lesson_count': coalesce(count(*[${lessonCountFilter}]), 0),
    live_event_start_time,
    live_event_end_time,
  }`

  console.log('ids query', query)
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
  } else if (type === 'pack') {
    typeFilter = `&& (_type == 'pack' || _type == 'semester-pack')`
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

export function getSortOrder(sort = '-published_on', brand, groupBy) {
  const sanitizedSort = sort?.trim() || '-published_on'
  let isDesc = sanitizedSort.startsWith('-')
  const sortField = isDesc ? sanitizedSort.substring(1) : sanitizedSort

  let sortOrder = ''

  switch (sortField) {
    case 'slug':
      sortOrder = groupBy ? 'name' : '!defined(title), lower(title)'
      break

    case 'popularity':
      if (groupBy == 'artist' || groupBy == 'genre') {
        sortOrder = isDesc ? `coalesce(popularity.${brand}, -1)` : 'popularity'
      } else {
        sortOrder = isDesc ? 'coalesce(popularity, -1)' : 'popularity'
      }
      break

    case 'recommended':
      sortOrder = 'published_on'
      isDesc = true
      break

    default:
      sortOrder = sortField
      break
  }

  sortOrder += isDesc ? ' desc' : ' asc'
  return sortOrder
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
      : `_type == '${contentType}' && brand == "${brand}"${includeStatusFilter ? statusFilter : ''}${style && excludeFilter !== 'style' ? ` && '${style}' in genre[]->name` : ''}${artist && excludeFilter !== 'artist' ? ` && artist->name == '${artist}'` : ''} ${progressFilter} ${filterWithoutOption || ''} ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}`
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

//Daniel Nov 14 2025 note - keeping this for when we migrate foundations to packs, so we know what fields to use.
/**
 * Fetch the Foundations 2019.
 * @param {string} slug - The slug of the method.
 * @returns {Promise<Object|null>} - The fetched foundation data or null if not found.
 */
export async function fetchFoundation(slug) {
  const filterParams = {}
  const query = await buildQuery(
    `_type == 'foundation' && slug.current == "${slug}"`,
    filterParams,
    getFieldsForContentType('foundation'),
    {
      sortOrder: 'published_on asc',
      isSingle: true,
    }
  )
  return fetchSanity(query, false)
}

/**
 * Fetch the Method (learning-paths) for a specific brand.
 * @param {string} brand - The brand for which to fetch methods.
 * @param {string} slug - The slug of the method.
 * @returns {Promise<Object|null>} - The fetched methods data or null if not found.
 */
//todo BEH-1446 depreciated. remove all old method functions
export async function fetchMethod(brand, slug) {
  const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()

  const query = `*[_type == 'learning-path' && brand == "${brand}" && slug.current == "${slug}"] {
    "description": ${descriptionField},
    "instructors":instructor[]->name,
    published_on,
    "id": railcontent_id,
    railcontent_id,
    "slug": slug.current,
    status,
    title,
    video,
    length_in_seconds,
    parent_content_data,
    "breadcrumbs_data": parent_content_data[] {
        "id": id,
        "title": *[railcontent_id == ^.id][0].title,
        "url": *[railcontent_id == ^.id][0].web_url_path
    } | order(length(url)),
    "type": _type,
    "permission_id": permission[]->railcontent_id,
    "levels": child[${childrenFilter}]->
      {
        "id": railcontent_id,
        published_on,
        child_count,
        difficulty,
        difficulty_string,
        "thumbnail": thumbnail.asset->url,
        "instructor": instructor[]->{name},
        title,
        "type": _type,
        "description": ${descriptionField},
        "url": web_url_path,
        web_url_path,
        xp,
        total_xp
      }
  } | order(published_on asc)`
  return fetchSanity(query, false)
}

/**
 * Fetch the child courses for a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next lesson data or null if not found.
 */
export async function fetchMethodChildren(railcontentId) {
  const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()

  const query = `*[railcontent_id == ${railcontentId}]{
    "child_count":coalesce(count(child[${childrenFilter}]->), 0),
    "id": railcontent_id,
    "description": ${descriptionField},
    "thumbnail": thumbnail.asset->url,
    title,
    xp,
    total_xp,
    parent_content_data,
     "resources": ${resourcesField},
    "breadcrumbs_data": parent_content_data[] {
        "id": id,
        "title": *[railcontent_id == ^.id][0].title,
        "url": *[railcontent_id == ^.id][0].web_url_path
    } | order(length(url)),
    'children': child[(${childrenFilter})]->{
        ${getFieldsForContentType('method')}
    },
  }[0..1]`
  return fetchSanity(query, true)
}

/**
 * Fetch the next lesson for a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @param {string} methodId - The RailcontentID of the method
 * @returns {Promise<Object|null>} - object with `nextLesson` and `previousLesson` attributes
 * @example
 * fetchMethodPreviousNextLesson(241284, 241247)
 *  .then(data => { console.log('nextLesson', data.nextLesson); console.log('prevlesson', data.prevLesson);})
 *  .catch(error => console.error(error));
 */
export async function fetchMethodPreviousNextLesson(railcontentId, methodId) {
  const sortedChildren = await fetchMethodChildrenIds(methodId)
  const index = sortedChildren.indexOf(Number(railcontentId))
  let nextId = sortedChildren[index + 1]
  let previousId = sortedChildren[index - 1]
  let ids = []
  if (nextId) ids.push(nextId)
  if (previousId) ids.push(previousId)
  let nextPrev = await fetchByRailContentIds(ids)
  const nextLesson = nextPrev.find((elem) => {
    return elem['id'] === nextId
  })
  const prevLesson = nextPrev.find((elem) => {
    return elem['id'] === previousId
  })
  return { nextLesson, prevLesson }
}

/**
 * Fetch all children of a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the method.
 * @returns {Promise<Array<Object>|null>} - The fetched children data or null if not found.
 */
export async function fetchMethodChildrenIds(railcontentId) {
  const childrenFilter = await new FilterBuilder(``, { isChildrenFilter: true }).buildFilter()

  const query = `*[ railcontent_id == ${railcontentId}]{
    'children': child[${childrenFilter}]-> {
        'id': railcontent_id,
        'type' : _type,
            'children': child[${childrenFilter}]-> {
                'id': railcontent_id,
                'type' : _type,
                    'children': child[${childrenFilter}]-> {
                        'id': railcontent_id,
                        'type' : _type,
            }
        }
    }
}`
  let allChildren = await fetchSanity(query, false)
  return getChildrenToDepth(allChildren, 4)
}

function getChildrenToDepth(parent, depth = 1) {
  let allChildrenIds = []
  if (parent && parent['children'] && depth > 0) {
    parent['children'].forEach((child) => {
      if (!child['children']) {
        allChildrenIds.push(child['id'])
      }
      allChildrenIds = allChildrenIds.concat(getChildrenToDepth(child, depth - 1))
    })
  }
  return allChildrenIds
}

/**
 * Fetch the next and previous lessons for a specific lesson by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next and previous lesson data or null if found.
 */
export async function fetchNextPreviousLesson(railcontentId) {
  const document = await fetchLessonContent(railcontentId)
  if (document.parent_content_data && document.parent_content_data.length > 0) {
    const lastElement = document.parent_content_data[document.parent_content_data.length - 1]
    const results = await fetchMethodPreviousNextLesson(railcontentId, lastElement.id)
    return results
  }
  const processedData = processMetadata(document.brand, document.type, true)
  let sortBy = processedData?.sortBy ?? 'published_on'
  const isDesc = sortBy.startsWith('-')
  sortBy = isDesc ? sortBy.substring(1) : sortBy
  let sortValue = document[sortBy]
  if (sortValue == null) {
    sortBy = 'railcontent_id'
    sortValue = document['railcontent_id']
  }
  const isNumeric = !isNaN(sortValue)
  let prevComparison = isNumeric ? `${sortBy} <= ${sortValue}` : `${sortBy} <= "${sortValue}"`
  let nextComparison = isNumeric ? `${sortBy} >= ${sortValue}` : `${sortBy} >= "${sortValue}"`
  const fields = getFieldsForContentType(document.type)
  const query = `{
      "prevLesson": *[brand == "${document.brand}" && status == "${document.status}" && _type == "${document.type}" && ${prevComparison} && railcontent_id != ${railcontentId}] | order(${sortBy} desc){${fields}}[0...1][0],
      "nextLesson": *[brand == "${document.brand}" && status == "${document.status}" && _type == "${document.type}" && ${nextComparison} && railcontent_id != ${railcontentId}] | order(${sortBy} asc){${fields}}[0...1][0]
    }`

  return await fetchSanity(query, true)
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
      "badge": *[references(^._id) && _type == 'content-award'][0].badge.asset->url,
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
    length_in_seconds,
    mp3_no_drums_no_click_url,
    mp3_no_drums_yes_click_url,
    mp3_yes_drums_no_click_url,
    mp3_yes_drums_yes_click_url,
    "permission_id": permission[]->railcontent_id,
    ${parentQuery}
    ...select(
      defined(live_event_start_time) => {
        "live_event_start_time": live_event_start_time,
        "live_event_end_time": live_event_end_time,
        "live_event_stream_id": live_event_stream_id,
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

  return fetchSanity(query, false, { customPostProcess: chapterProcess, processNeedAccess: true })
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
  const queryFields = `_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail":thumbnail.asset->url, length_in_seconds, status, "type": _type, difficulty, difficulty_string, artist->, "permission_id": permission[]->railcontent_id, "genre": genre[]->name, "parent_id": parent_content_data[0].id`

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

  const queryFields = `_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail":thumbnail.asset->url, length_in_seconds, status, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type, "genre": genre[]->name`

  const query = `*[railcontent_id == ${railContentId} && (!defined(permission) || references(*[_type=='permission']._id))]{
   _type, parent_type, railcontent_id,
    "related_lessons" : array::unique([
      ...(*[${filterSameArtist}]{${queryFields}}|order(published_on desc, title asc)[0...10]),
      ...(*[${filterSameGenre}]{${queryFields}}|order(published_on desc, title asc)[0...10]),
      ])[0...10]}`

  return await fetchSanity(query, false, { processNeedAccess: true })
}

/**
 * Fetch all packs.
 * @param {string} brand - The brand for which to fetch packs.
 * @param {string} [searchTerm=""] - The search term to filter packs.
 * @param {string} [sort="-published_on"] - The field to sort the packs by.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
 */
export async function fetchAllPacks(
  brand,
  sort = '-published_on',
  searchTerm = '',
  page = 1,
  limit = 10
) {
  const sortOrder = getSortOrder(sort, brand)
  const filter = `(_type == 'pack' || _type == 'semester-pack') && brand == '${brand}' && title match "${searchTerm}*"`
  const filterParams = {}
  const start = (page - 1) * limit
  const end = start + limit

  const query = await buildQuery(
    filter,
    filterParams,
    await getFieldsForContentTypeWithFilteredChildren('pack'),
    {
      sortOrder: sortOrder,
      start,
      end,
    }
  )
  return fetchSanity(query, true)
}

/**
 * Fetch all content for a specific pack by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the pack.
 * @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
 */
export async function fetchPackAll(railcontentId, type = 'pack') {
  return fetchByRailContentId(railcontentId, type)
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

  // See LiveStreamEventService.getCurrentOrNextLiveEvent for some nice complicated logic which I don't think is actually importart
  // this has some +- on times
  // But this query just finds the first scheduled event (sorted by start_time) that ends after now()
  const query =
    forcedContentId !== null
      ? `*[railcontent_id == ${forcedContentId} ]{
      'slug': slug.current,
      'id': railcontent_id,
      live_event_start_time,
      live_event_end_time,
      live_event_stream_id,
      railcontent_id,
      published_on,
      'event_coach_url' : instructor[0]->web_url_path,
      'event_coach_calendar_id': coalesce(calendar_id, '${defaultCalendarID}'),
      title,
      "thumbnail": thumbnail.asset->url,
      ${artistOrInstructorName()},
      difficulty_string,
      "instructors": ${instructorField},
      'videoId': coalesce(live_event_stream_id, video.external_id),
    } | order(live_event_start_time)[0...1]`
      : `*[status == 'scheduled' && brand == '${brand}' && defined(live_event_start_time) && live_event_start_time <= '${getSanityDate(startDateTemp, false)}' && live_event_end_time >= '${getSanityDate(endDateTemp, false)}']{
      'slug': slug.current,
      'id': railcontent_id,
      live_event_start_time,
      live_event_end_time,
      live_event_stream_id,
      railcontent_id,
      published_on,
      'event_coach_url' : instructor[0]->web_url_path,
      'event_coach_calendar_id': coalesce(calendar_id, '${defaultCalendarID}'),
      title,
      "thumbnail": thumbnail.asset->url,
      ${artistOrInstructorName()},
      difficulty_string,
      "instructors": instructor[]->{
            name,
            web_url_path,
          },
      'videoId': coalesce(live_event_stream_id, video.external_id),
    } | order(live_event_start_time)[0...1]`

  return await fetchSanity(query, false, { processNeedAccess: false })
}

/**
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
  const builder = await new FilterBuilder(`railcontent_id == ${id}`).buildFilter()
  const query = `*[${builder}]{
    ${await getFieldsForContentTypeWithFilteredChildren('pack')}
  } [0...1]`
  return fetchSanity(query, false)
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

export async function fetchTopLevelParentId(railcontentId) {
  const statusFilter = "&& status in ['scheduled', 'published', 'archived', 'unlisted']"

  const query = `*[railcontent_id == ${railcontentId}]{
      railcontent_id,
      'parents': *[^._id in child[]._ref ${statusFilter}]{
        railcontent_id,
          'parents': *[^._id in child[]._ref ${statusFilter}]{
            railcontent_id,
            'parents': *[^._id in child[]._ref ${statusFilter}]{
              railcontent_id,
               'parents': *[^._id in child[]._ref ${statusFilter}]{
                  railcontent_id,
            }
          }
        }
      }
    }`
  let response = await fetchSanity(query, false, { processNeedAccess: false })
  if (!response) return null
  let currentLevel = response
  for (let i = 0; i < 4; i++) {
    if (currentLevel['parents'].length > 0) {
      currentLevel = currentLevel['parents'][0]
    } else {
      return currentLevel['railcontent_id']
    }
  }
  return null
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
  let contentId = currentLevel['railcontent_id']
  let children = currentLevel['children']

  data.parents[contentId] = parentId
  if (children) {
    data.children[contentId] = children.map((child) => child['railcontent_id'])
    for (let i = 0; i < children.length; i++) {
      populateHierarchyLookups(children[i], data, contentId)
    }
  } else {
    data.children[contentId] = []
  }

  let assignments = currentLevel['assignments']
  if (assignments) {
    let assignmentIds = assignments.map((assignment) => assignment['railcontent_id'])
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
 *
 * @param {string} query - The GROQ query to execute against the Sanity API.
 * @param {boolean} isList - Whether to return an array or a single result.
 * @param {Object} options - Additional options for fetching data.
 * @param {Function} [options.customPostProcess=null] - custom post process callback
 * @param {boolean} [options.processNeedAccess=true] - execute the needs_access callback
 * @param {boolean} [options.processPageType=true] - execute the page_type callback
 * @returns {Promise<*|null>} - A promise that resolves to the fetched data or null if an error occurs or no results are found.
 *
 * @example
 * const query = `*[_type == "song"]{title, artist->name}`;
 * fetchSanity(query, true)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */

export async function fetchSanity(
  query,
  isList,
  { customPostProcess = null, processNeedAccess = true, processPageType = true } = {}
) {
  // Check the config object before proceeding
  if (!checkSanityConfig(globalConfig)) {
    return null
  }

  const perspective = globalConfig.sanityConfig.perspective ?? 'published'
  const api = globalConfig.sanityConfig.useCachedAPI ? 'apicdn' : 'api'
  const url = `https://${globalConfig.sanityConfig.projectId}.${api}.sanity.io/v${globalConfig.sanityConfig.version}/data/query/${globalConfig.sanityConfig.dataset}?perspective=${perspective}`
  const headers = {
    'Content-Type': 'application/json',
  }

  try {
    const method = 'post'
    const options = {
      method,
      headers,
      body: JSON.stringify({ query: query }),
    }

    const adapter = getPermissionsAdapter()
    let promisesResult = await Promise.all([
      fetch(url, options),
      processNeedAccess ? adapter.fetchUserPermissions() : null,
    ])
    const response = promisesResult[0]
    const userPermissions = promisesResult[1]

    if (!response.ok) {
      throw new Error(`Sanity API error: ${response.status} - ${response.statusText}`)
    }
    const result = await response.json()
    if (result.result) {
      let results = isList ? result.result : result.result[0]
      if (!results) {
        throw new Error('No results found')
      }
      results = processNeedAccess ? await needsAccessDecorator(results, userPermissions) : results
      results = processPageType ? pageTypeDecorator(results) : results
      return customPostProcess ? customPostProcess(results) : results
    } else {
      throw new Error('No results found')
    }
  } catch (error) {
    console.error('fetchSanity: Fetch error:', { error, query })
    return null
  }
}

function contentResultsDecorator(results, fieldName, callback) {
  if (Array.isArray(results)) {
    results.forEach((result) => {
      // Check if this is a content row structure
      if (result.content && Array.isArray(result.content)) {
        // Content rows structure: array of rows, each with a content array
        result.content.forEach((contentItem) => {
          if (contentItem) {
            contentItem[fieldName] = callback(contentItem)
          }
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results.entity && Array.isArray(results.entity)) {
    // Group By
    results.entity.forEach((result) => {
      if (result.lessons) {
        result.lessons.forEach((lesson) => {
          lesson[fieldName] = callback(lesson) // Updated to check lesson access
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results.related_lessons && Array.isArray(results.related_lessons)) {
    results.related_lessons.forEach((result) => {
      result[fieldName] = callback(result)
    })
  } else {
    results[fieldName] = callback(results)
  }

  return results
}

function pageTypeDecorator(results) {
  return contentResultsDecorator(results, 'page_type', function (content) {
    return SONG_TYPES_WITH_CHILDREN.includes(content['type']) ? 'song' : 'lesson'
  })
}

function needsAccessDecorator(results, userPermissions) {
  if (globalConfig.sanityConfig.useDummyRailContentMethods) return results
  const adapter = getPermissionsAdapter()
  return contentResultsDecorator(results, 'need_access', function (content) {
    return adapter.doesUserNeedAccess(content, userPermissions)
  })
}

function doesUserNeedAccessToContent(result, userPermissions) {
  // Legacy function - now delegates to adapter
  // Kept for backwards compatibility if used elsewhere
  const adapter = getPermissionsAdapter()
  return adapter.doesUserNeedAccess(result, userPermissions)
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
 * @returns {Promise<{name, description, type: *, thumbnailUrl}>}
 *
 * @example
 *
 * fetchMetadata('drumeo','song')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchMetadata(brand, type) {
  let processedData = processMetadata(brand, type, true)
  if (processedData?.onlyAvailableTabs === true) {
    const activeTabs = await fetchRecentActivitiesActiveTabs()
    processedData.tabs = activeTabs
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
  const chatData = await fetchHandler(url)
  const mergedData = { ...chatData, ...liveEvent[0] }
  return mergedData
}

//Helper Functions
function arrayJoinWithQuotes(array, delimiter = ',') {
  const wrapped = array.map((value) => `'${value}'`)
  return wrapped.join(delimiter)
}

export function getSanityDate(date, roundToHourForCaching = true) {
  if (roundToHourForCaching) {
    // We need to set the published on filter date to be a round time so that it doesn't bypass the query cache
    // with every request by changing the filter date every second. I've set it to one minute past the current hour
    // because publishing usually publishes content on the hour exactly which means it should still skip the cache
    // when the new content is available.
    // Round to the start of the current hour
    const roundedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours()
    )

    return roundedDate.toISOString()
  }

  return date.toISOString()
}

function getDateOnly(date = new Date()) {
  return date.toISOString().split('T')[0]
}

const merge = (a, b, predicate = (a, b) => a === b) => {
  const c = [...a] // copy to avoid side effects
  // add all items from B to copy C if they're not already present
  b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
  return c
}

function checkSanityConfig(config) {
  if (!config.sanityConfig.token) {
    console.warn('fetchSanity: The "token" property is missing in the config object.')
    return false
  }
  if (!config.sanityConfig.projectId) {
    console.warn('fetchSanity: The "projectId" property is missing in the config object.')
    return false
  }
  if (!config.sanityConfig.dataset) {
    console.warn('fetchSanity: The "dataset" property is missing in the config object.')
    return false
  }
  if (!config.sanityConfig.version) {
    console.warn('fetchSanity: The "version" property is missing in the config object.')
    return false
  }
  return true
}

function buildRawQuery(
  filter = '',
  fields = '...',
  { sortOrder = 'published_on desc', start = 0, end = 10, isSingle = false }
) {
  const sortString = sortOrder ? `order(${sortOrder})` : ''
  const countString = isSingle ? '[0...1]' : `[${start}...${end}]`
  const query = `*[${filter}]{
        ${fields}
    } | ${sortString}${countString}`
  return query
}

async function buildQuery(
  baseFilter = '',
  filterParams = { pullFutureContent: false },
  fields = '...',
  { sortOrder = 'published_on desc', start = 0, end = 10, isSingle = false }
) {
  const filter = await new FilterBuilder(baseFilter, filterParams).buildFilter()
  return buildRawQuery(filter, fields, { sortOrder, start, end, isSingle })
}

export function buildEntityAndTotalQuery(
  filter = '',
  fields = '...',
  {
    sortOrder = 'published_on desc',
    start = 0,
    end = 10,
    isSingle = false,
    withoutPagination = false,
  }
) {
  const sortString = sortOrder ? ` | order(${sortOrder})` : ''
  const countString = isSingle ? '[0...1]' : withoutPagination ? `` : `[${start}...${end}]`
  const query = `{
      "entity": *[${filter}]  ${sortString}${countString}
      {
        ${fields}
      },
      "total": 0
    }`
  return query
}

function getFilterOptions(option, commonFilter, contentType, brand) {
  let filterGroq = ''
  const types = Array.from(new Set([...coachLessonsTypes, ...showsTypes[brand]]))

  switch (option) {
    case 'difficulty':
      filterGroq = `
                "difficulty": [
        {"type": "All", "count": count(*[${commonFilter} && difficulty_string == "All"])},
        {"type": "Introductory", "count": count(*[${commonFilter} && (difficulty_string == "Novice" || difficulty_string == "Introductory")])},
        {"type": "Beginner", "count": count(*[${commonFilter} && difficulty_string == "Beginner"])},
        {"type": "Intermediate", "count": count(*[${commonFilter} && difficulty_string == "Intermediate" ])},
        {"type": "Advanced", "count": count(*[${commonFilter} && difficulty_string == "Advanced" ])},
        {"type": "Expert", "count": count(*[${commonFilter} && difficulty_string == "Expert" ])}
        ][count > 0],`
      break
    case 'type':
      const typesString = types
        .map((t) => {
          return `{"type": "${t}"}`
        })
        .join(', ')
      filterGroq = `"type": [${typesString}]{type, 'count': count(*[_type == ^.type && ${commonFilter}])}[count > 0],`
      break
    case 'genre':
    case 'essential':
    case 'focus':
    case 'theory':
    case 'topic':
    case 'lifestyle':
    case 'creativity':
      filterGroq = `
            "${option}": *[_type == '${option}' ${contentType ? ` && '${contentType}' in filter_types` : ''} ] {
            "type": name,
                "count": count(*[${commonFilter} && references(^._id)])
        }[count > 0],`
      break
    case 'instrumentless':
      filterGroq = `
            "${option}":  [
                  {"type": "Full Song Only", "count": count(*[${commonFilter} && instrumentless == false ])},
                  {"type": "Instrument Removed", "count": count(*[${commonFilter} && instrumentless == true ])}
              ][count > 0],`
      break
    case 'gear':
      filterGroq = `
            "${option}":  [
                  {"type": "Practice Pad", "count": count(*[${commonFilter} && gear match 'Practice Pad' ])},
                  {"type": "Drum-Set", "count": count(*[${commonFilter} && gear match 'Drum-Set'])}
              ][count > 0],`
      break
    case 'bpm':
      filterGroq = `
            "${option}":  [
                  {"type": "50-90", "count": count(*[${commonFilter} && bpm > 50 && bpm < 91])},
                  {"type": "91-120", "count": count(*[${commonFilter} && bpm > 90 && bpm < 121])},
                  {"type": "121-150", "count": count(*[${commonFilter} && bpm > 120 && bpm < 151])},
                  {"type": "151-180", "count": count(*[${commonFilter} && bpm > 150 && bpm < 181])},
                  {"type": "180+", "count": count(*[${commonFilter} && bpm > 180])},
              ][count > 0],`
      break
    default:
      filterGroq = ''
      break
  }

  return filterGroq
}

function cleanUpGroq(query) {
  // Split the query into clauses based on the logical operators
  const clauses = query.split(/(\s*&&|\s*\|\|)/).map((clause) => clause.trim())

  // Filter out empty clauses
  const filteredClauses = clauses.filter((clause) => clause.length > 0)

  // Check if there are valid conditions in the clauses
  const hasConditions = filteredClauses.some((clause) => !clause.match(/^\s*&&\s*|\s*\|\|\s*$/))

  if (!hasConditions) {
    // If no valid conditions, return an empty string or the original query
    return ''
  }

  // Remove occurrences of '&& ()'
  const cleanedQuery = filteredClauses
    .join(' ')
    .replace(/&&\s*\(\)/g, '')
    .replace(/(\s*&&|\s*\|\|)(?=\s*[\s()]*$|(?=\s*&&|\s*\|\|))/g, '')
    .trim()

  return cleanedQuery
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

  filter = `brand == "${brand}" && (defined(railcontent_id)) ${includedFieldsFilter} ${progressFilter}`
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
  const filterWithRestrictions = await new FilterBuilder(filter, {
    showMembershipRestrictedContent: true,
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

export async function fetchScheduledAndNewReleases(
  brand,
  { page = 1, limit = 20, sort = '-published_on' } = {}
) {
  const upcomingTypes = getUpcomingEventsTypes(brand)
  const newTypes = getNewReleasesTypes(brand)

  const scheduledTypes = merge(upcomingTypes, newTypes)
  const typesString = arrayJoinWithQuotes(scheduledTypes)
  const now = getSanityDate(new Date())

  const start = (page - 1) * limit
  const end = start + limit
  const sortOrder = getSortOrder(sort, brand)

  const query = `
    *[_type in [${typesString}] && brand == '${brand}' && ((status in ['published','scheduled'] )||(show_in_new_feed == true)) ]
    [${start}...${end}]
   | order(published_on asc) {
      "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "thumbnail": thumbnail.asset->url,
      ${artistOrInstructorName()},
      "artists": instructor[]->name,
      difficulty,
      difficulty_string,
      length_in_seconds,
      published_on,
      "type": _type,
      show_in_new_feed,
      "permission_id": permission[]->railcontent_id,
      "isLive": live_event_start_time <= '${now}' && live_event_end_time >= '${now}',
  }`

  return fetchSanity(query, true)
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
    'learningPaths': child[]->{
      'id': railcontent_id,
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

  const fieldsString = DEFAULT_FIELDS.join(',')

  const query = buildEntityAndTotalQuery(filterWithRestrictions, fieldsString, {
    sortOrder: sortOrder,
    start: start,
    end: end,
  })

  return fetchSanity(query, true)
}
