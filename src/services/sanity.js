/**
 * @module Sanity-Services
 */
import {
    artistOrInstructorName,
    artistOrInstructorNameAsArray,
    assignmentsField,
    descriptionField,
    contentTypeConfig,
    DEFAULT_FIELDS,
    getFieldsForContentType,
    filtersToGroq,
    getUpcomingEventsTypes,
    showsTypes,
    getNewReleasesTypes,
    coachLessonsTypes
} from "../contentTypeConfig";

import {
    processMetadata,
    typeWithSortOrder
} from "../contentMetaData";

import {globalConfig} from "./config";

import {
    fetchAllCompletedStates,
    fetchCompletedChallenges,
    fetchCurrentSongComplete,
    fetchOwnedChallenges
} from './railcontent.js';
import {arrayToStringRepresentation, FilterBuilder} from "../filterBuilder";
import {fetchUserPermissions} from "./userPermissions";
import {getAllCompleted, getAllStarted, getAllStartedOrCompleted} from "./contentProgress";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['handleCustomFetchAll'];

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
    const fields = getFieldsForContentType('song');
    const filterParams = {};
    const query = await buildQuery(
        `_type == "song" && railcontent_id == ${documentId}`,
        filterParams,
        fields,
        {
            isSingle: true,
        });
    return fetchSanity(query, false);
}

/**
 * Fetch all artists with lessons available for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch artists.
 * @returns {Promise<Object|null>} - A promise that resolves to an array of artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtists(brand) {
    const filter = await new FilterBuilder(`_type == "song" && brand == "${brand}" && references(^._id)`, {bypassPermissions: true}).buildFilter();
    const query = `
  *[_type == "artist"]{
    name,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0]`;
    return fetchSanity(query, true, {processNeedAccess: false});
}

/**
 * Fetch current number of artists for songs within a brand.
 * @param {string} brand - The current brand.
 * @returns {Promise<int|null>} - The fetched count of artists.
 */
export async function fetchSongArtistCount(brand) {
    const query = `count(*[_type == 'artist']{'lessonsCount': count(*[_type == 'song' && brand == '${brand}' && references(^._id)]._id)}[lessonsCount > 0])`;
    return fetchSanity(query, true, {processNeedAccess: false});
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
    const query = `
      *[_type == "song" && railcontent_id == ${songId}]{
        "entity": array::unique([
            ...(*[_type == "song" && brand == "${brand}" && railcontent_id != ${songId} && references(^.artist->_id)]{
            "type": _type,
            "id": railcontent_id,
            "url": web_url_path,
            "published_on": published_on,
            status,
            "image": thumbnail.asset->url,
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
            ...(*[_type == "song" && brand == "${brand}" && railcontent_id != ${songId} && references(^.genre[]->_id)]{
            "type": _type,
            "id": railcontent_id,
            "url": web_url_path,
            "published_on": published_on,
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
    }`;

    // Fetch the related songs data
    return fetchSanity(query, false);
}

/**
 * Fetch all songs for a specific brand with pagination and search options.
 * @param {string} brand - The brand for which to fetch songs.
 * @param {Object} params - Parameters for pagination, filtering, and sorting.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of songs per page.
 * @param {string} [params.searchTerm=""] - The search term to filter songs by title or artist.
 * @param {string} [params.sort="-published_on"] - The field to sort the songs by.
 * @param {Array<string>} [params.includedFields=[]] - The fields to include in the query.
 * @param {string} [params.groupBy=""] - The field to group the results by.
 * @returns {Promise<Object|null>} - The fetched song data or null if not found.
 *
 * @example
 * fetchAllSongs('drumeo', {
 *   page: 2,
 *   limit: 20,
 *   searchTerm: 'rock',
 *   sort: 'published_on',
 *   includedFields: ['difficulty', 'style'],
 *   groupBy: 'artist'
 * })
 *   .then(result => console.log(result))
 *   .catch(error => console.error(error));
 */
export async function fetchAllSongs(brand, {
    page = 1,
    limit = 10,
    searchTerm = "",
    sort = "-published_on",
    includedFields = [],
    groupBy = ""
}) {
    return fetchAll(brand, 'song', {page, limit, searchTerm, sort, includedFields, groupBy});
}

/**
 * Fetch filter options for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch filter options.
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing filter options or null if not found.
 *
 * @example
 * fetchSongFilterOptions('drumeo')
 *   .then(options => console.log(options))
 *   .catch(error => console.error(error));
 */
export async function fetchSongFilterOptions(brand) {
    const query = `
  {
    "difficulty": [
      {"type": "Introductory", "count": count(*[_type == 'song' && brand == '${brand}' && difficulty_string == "Introductory"]._id)},
      {"type": "Beginner", "count": count(*[_type == 'song' && brand == '${brand}' && difficulty_string == "Beginner"]._id)},
      {"type": "Intermediate", "count": count(*[_type == 'song' && brand == '${brand}' && difficulty_string == "Intermediate"]._id)},
      {"type": "Advanced", "count": count(*[_type == 'song' && brand == '${brand}' && difficulty_string == "Advanced"]._id)},
      {"type": "Expert", "count": count(*[_type == 'song' && brand == '${brand}' && difficulty_string == "Expert"]._id)}
    ],
    "genre": *[_type == 'genre' && 'song' in filter_types] {
      "type": name,
      "count": count(*[_type == 'song' && brand == '${brand}' && references(^._id)]._id)
    },
    "instrumentless": [
      {"type": "Full Song Only", "count": count(*[_type == 'song' && brand == '${brand}' && instrumentless == false]._id)},
      {"type": "Instrument Removed", "count": count(*[_type == 'song' && brand == '${brand}' && instrumentless == true]._id)}
    ]
  }`;

    return fetchSanity(query, true);
}

/**
 * Fetch the total count of songs for a specific brand.
 * @param {string} brand - The brand for which to fetch the song count.
 * @returns {Promise<number|null>} - The total count of songs or null if an error occurs.
 */
export async function fetchSongCount(brand) {
    const query = `count(*[_type == 'song' && brand == "${brand}"])`;
    return fetchSanity(query, true, {processNeedAccess: false});
}

/**
 * Fetch the latest workouts for a specific brand, including completion status and progress.
 * This function retrieves up to five of the latest workout content for a given brand, sorted in descending order by their publication date.
 * It also includes completion status and progress percentage for each workout by fetching additional data about user progress.
 *
 * @param {string} brand - The brand for which to fetch workouts (e.g., 'drumeo', 'pianote').
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of workout data objects with additional properties for completion status and progress percentage,
 *     or null if no workouts are found.
 *
 * @example
 * fetchWorkouts('drumeo')
 *   .then(workouts => console.log(workouts))
 *   .catch(error => console.error(error));
 */
export async function fetchWorkouts(brand) {
    const fields = getFieldsForContentType('workout');
    const query = `*[_type == 'workout' && brand == '${brand}'] [0...5] {
        ${fields.toString()}
      } | order(published_on desc)[0...5]`
    return fetchSanity(query, true);
}

/**
 * Fetch the latest new releases for a specific brand.
 * @param {string} brand - The brand for which to fetch new releases.
 * @returns {Promise<Object|null>} - The fetched new releases data or null if not found.
 */
export async function fetchNewReleases(brand, {page = 1, limit = 20, sort = "-published_on"} = {}) {
    const newTypes = getNewReleasesTypes(brand);
    const typesString = arrayToStringRepresentation(newTypes);
    const start = (page - 1) * limit;
    const end = start + limit;
    const sortOrder = getSortOrder(sort);
    const filter = `_type in ${typesString} && brand == '${brand}'`;
    const fields = `
     "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "artist_name": instructor[0]->name,
      "artists": instructor[]->name,
      difficulty,
      difficulty_string,
      length_in_seconds,
      published_on,
      "type": _type,
      web_url_path,
      "permission_id": permission[]->railcontent_id,
      `;
    const filterParams = {};
    const query = await buildQuery(
        filter,
        filterParams,
        fields,
        {
            sortOrder: sortOrder,
            start,
            end: end,
        });
    return fetchSanity(query, true);
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
export async function fetchUpcomingEvents(brand, {page = 1, limit = 10} = {}) {
    const liveTypes = getUpcomingEventsTypes(brand);
    const typesString = arrayToStringRepresentation(liveTypes);
    const now = getSanityDate(new Date());
    const start = (page - 1) * limit;
    const end = start + limit;
    const fields = `
        "id": railcontent_id,
        title,
        "image": thumbnail.asset->url,
        "artist_name": instructor[0]->name,
        "artists": instructor[]->name,
        difficulty,
        difficulty_string,
        length_in_seconds,
        published_on,
        "type": _type,
        web_url_path,
        "permission_id": permission[]->railcontent_id,`;
    const query = buildRawQuery(
        `_type in ${typesString} && brand == '${brand}' && published_on > '${now}' && status == 'scheduled'`,
        fields,
        {
            sortOrder: 'published_on asc',
            start: start,
            end: end,
        },
    );
    return fetchSanity(query, true);
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
export async function fetchScheduledReleases(brand, {page = 1, limit = 10}) {
    const upcomingTypes = getUpcomingEventsTypes(brand);
    const newTypes = getNewReleasesTypes(brand);

    const scheduledTypes = merge(upcomingTypes, newTypes)
    const typesString = arrayJoinWithQuotes(scheduledTypes);
    const now = getSanityDate(new Date());
    const start = (page - 1) * limit;
    const end = start + limit;
    const query = `*[_type in [${typesString}] && brand == '${brand}' && status in ['published','scheduled'] && published_on > '${now}']{
      "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "artist_name": instructor[0]->name,
      "artists": instructor[]->name,
      difficulty,
      difficulty_string,
      length_in_seconds,
      published_on,
      "type": _type,
      web_url_path,
      "permission_id": permission[]->railcontent_id,
  } | order(published_on asc)[${start}...${end}]`;
    return fetchSanity(query, true);
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

    const query = buildRawQuery(
        `railcontent_id == ${id} && _type == '${contentType}'`,
        getFieldsForContentType(contentType),
        {
            isSingle: true,
        },
    );

    return fetchSanity(query, false);
}

/**
 * Fetch content by an array of Railcontent IDs.
 *
 * @param {Array<string>} ids - The array of Railcontent IDs of the content to fetch.
 * @param {string} [contentType] - The content type the IDs to add needed fields to the response.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of content objects or null if not found.
 *
 * @example
 * fetchByRailContentIds(['abc123', 'def456', 'ghi789'])
 *   .then(contents => console.log(contents))
 *   .catch(error => console.error(error));
 */
export async function fetchByRailContentIds(ids, contentType = undefined) {
    const idsString = ids.join(',');

    const query = `*[railcontent_id in [${idsString}]]{
        ${getFieldsForContentType(contentType)}
      }`
    return fetchSanity(query, true);
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
export async function fetchAll(brand, type, {
    page = 1,
    limit = 10,
    searchTerm = "",
    sort = "-published_on",
    includedFields = [],
    groupBy = "",
    progressIds = undefined,
    useDefaultFields = true,
    customFields = [],
    progress = "all"
} = {}) {
    let customResults = await handleCustomFetchAll(brand, type, {
        page,
        limit,
        searchTerm,
        sort,
        includedFields,
        groupBy,
        progressIds,
        useDefaultFields,
        customFields,
        progress});
    if (customResults) {
        return customResults;
    }

    let config = contentTypeConfig[type] ?? {};
    let additionalFields = config?.fields ?? [];
    let isGroupByOneToOne = (groupBy ? config?.relationships?.[groupBy]?.isOneToOne : false) ?? false;
    let webUrlPathType = config?.slug ?? type;
    const start = (page - 1) * limit;
    const end = start + limit;
    let bypassStatusAndPublishedValidation = (type == 'instructor');

    // Construct the type filter
    const typeFilter = type ? `&& _type == '${type}'` : "";

    // Construct the search filter
    const searchFilter = searchTerm
        ? groupBy !== "" ?
            `&& (^.name match "${searchTerm}*" || title match "${searchTerm}*")`
            : `&& (artist->name match "${searchTerm}*" || instructor[]->name match "${searchTerm}*" || title match "${searchTerm}*" || name match "${searchTerm}*")`
        : "";

    // Construct the included fields filter, replacing 'difficulty' with 'difficulty_string'
    const includedFieldsFilter = includedFields.length > 0
        ? filtersToGroq(includedFields)
        : "";

    // limits the results to supplied progressIds for started & completed filters
    const progressFilter = await getProgressFilter(progress, progressIds);

    // Determine the sort order
    const sortOrder = getSortOrder(sort);

    let fields = useDefaultFields ? customFields.concat(DEFAULT_FIELDS, additionalFields) : customFields;
    let fieldsString = fields.join(',');

    // Determine the group by clause
    let query = "";
    let entityFieldsString = "";
    let filter = "";
    if (groupBy !== "" && isGroupByOneToOne) {
        const webUrlPath = 'artists';
        const lessonsFilter = `_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter} ${progressFilter}`;
        entityFieldsString = `
                'id': railcontent_id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'web_url_path': '/${brand}/${webUrlPath}/'+name+'?included_fieds[]=type,${type}',
                'all_lessons_count': count(*[${lessonsFilter}]._id),
                'lessons': *[${lessonsFilter}]{
                    ${fieldsString},
                    ${groupBy}
                }[0...20]
        `;
        filter = `_type == '${groupBy}' && count(*[brand == '${brand}' && ^._id == ${groupBy}._ref ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter}]._id) > 0`;
    } else if (groupBy !== "") {
        const webUrlPath = (groupBy == 'genre') ? '/genres' : '';
        const lessonsFilter = `brand == '${brand}' && ^._id in ${groupBy}[]._ref ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter}`;
        entityFieldsString = `
                'id': railcontent_id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'web_url_path': select(defined(web_url_path)=> web_url_path +'?included_fieds[]=type,${type}',!defined(web_url_path)=> '/${brand}${webUrlPath}/'+name+'/${webUrlPathType}'),
                'all_lessons_count': count(*[${lessonsFilter}]._id),
                'lessons': *[${lessonsFilter}]{
                    ${fieldsString},
                    ${groupBy}
                }[0...20]`;
        filter = `_type == '${groupBy}' && count(*[brand == '${brand}' && ^._id in ${groupBy}[]._ref ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter}]._id) > 0`;
    } else {
        filter = `brand == "${brand}" ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter}`
        entityFieldsString = fieldsString;
    }

    const filterWithRestrictions = await new FilterBuilder(filter,{bypassStatuses:bypassStatusAndPublishedValidation, bypassPermissions: bypassStatusAndPublishedValidation, bypassPublishedDateRestriction: bypassStatusAndPublishedValidation} ).buildFilter();
    query = buildEntityAndTotalQuery(
        filterWithRestrictions,
        entityFieldsString,
        {
            sortOrder: sortOrder,
            start: start,
            end: end,
        });

    return fetchSanity(query, true);
}

/**
 * Fetch all content that requires custom handling or a distinct external call
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
 */
async function handleCustomFetchAll(brand, type, {
    page = 1,
    limit = 10,
    searchTerm = "",
    sort = "-published_on",
    includedFields = [],
    groupBy = "",
    progressIds = undefined,
    useDefaultFields = true,
    customFields = [],
    progress = "all"
} = {}) {
    if (type === 'challenge') {
        if (groupBy === 'completed') {
            return fetchCompletedChallenges(brand, page, limit);
        } else if(groupBy === 'owned') {
            return fetchOwnedChallenges(brand, page, limit);
        }
    }
    return null;
}

async function getProgressFilter(progress, progressIds) {
    switch (progress) {
        case "all":
            return progressIds !== undefined ?
                `&& railcontent_id in [${progressIds.join(',')}]` : "";
        case "in progress": {
            const ids = await getAllStarted();
            return `&& railcontent_id in [${ids.join(',')}]`;
        }
        case "completed": {
            const ids = await getAllCompleted();
            return `&& railcontent_id in [${ids.join(',')}]`;
        }
        case "not started": {
            const ids = await getAllStartedOrCompleted();
            return `&& !(railcontent_id in [${ids.join(',')}])`;
        }
        default:
            throw new Error(`'${progress}' progress option not implemented`);
    }
}

export function getSortOrder(sort = '-published_on', groupBy) {
    // Determine the sort order
    let sortOrder = '';
    const isDesc = sort.startsWith('-');
    sort = isDesc ? sort.substring(1) : sort;
    switch (sort) {
        case "slug":
            sortOrder = groupBy ? 'name' : "title";
            break;
        case "name":
        case "popularity":
            sortOrder = sort;
            break;
        case "published_on":
        default:
            sortOrder = "published_on";
            break;
    }
    sortOrder += isDesc ? ' desc' : ' asc';
    return sortOrder;
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
    includeTabs = false,
) {
    if (coachId && contentType !== 'coach-lessons') {
        throw new Error(`Invalid contentType: '${contentType}' for coachId. It must be 'coach-lessons'.`);
    }

    const includedFieldsFilter = filters?.length ? filtersToGroq(filters) : undefined;
    const progressFilter = progressIds ? `&& railcontent_id in [${progressIds.join(',')}]` : "";

    const constructCommonFilter = (excludeFilter) => {
        const filterWithoutOption = excludeFilter ? filtersToGroq(filters, excludeFilter) : includedFieldsFilter;
        return coachId
            ? `brand == '${brand}' && references(*[_type=='instructor' && railcontent_id == ${coachId}]._id) ${filterWithoutOption || ''}`
            : `_type == '${contentType}' && brand == "${brand}"${style && excludeFilter !== "style" ? ` && '${style}' in genre[]->name` : ''}${artist && excludeFilter !== "artist" ? ` && artist->name == '${artist}'` : ''} ${progressFilter} ${filterWithoutOption || ''}`;
    };

    const metaData = processMetadata(brand, contentType, true);
    const allowableFilters = metaData?.allowableFilters || [];
    const tabs = metaData?.tabs || [];
    const catalogName = metaData?.shortname || metaData?.name;

    const dynamicFilterOptions = allowableFilters.map(filter => getFilterOptions(filter, constructCommonFilter(filter), contentType, brand)).join(' ');

    const query = `
      {
        "meta": {
          "totalResults": count(*[${constructCommonFilter()}
            ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}]),
          "filterOptions": {
            ${dynamicFilterOptions}
          }
      }
    }`;

    const results = await fetchSanity(query, true, {processNeedAccess: false});

    return includeTabs ? {...results, tabs, catalogName} : results;
}


/**
 * Fetch children content by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the parent content.
 * @param {string} [contentType] - The content type the IDs to add needed fields to the response.
 * @returns {Promise<Array<Object>|null>} - The fetched children content data or [] if not found.
 */
export async function fetchChildren(railcontentId, contentType) {
    const query = `*[railcontent_id == ${railcontentId}]{
        title,

        'children': child[]->{
                           ${getFieldsForContentType(contentType)}
                        },
      }[0..1]`;
    let parent = await fetchSanity(query, false);
    return parent['children'] ?? [];
}

/**
 *
 * @param railcontentId - railcontent id of the child
 * @returns {Promise<Array<string>|null>} - The fetched parent content data or [] if not found
 */
export async function fetchParentByRailContentId(railcontentId) {
    const query = `*[railcontent_id == ${railcontentId}]{
        'parents': array::unique([
            ...(*[references(^._id)]{
                ${getFieldsForContentType()}
                })
            ])
        }[0...1]`;
    let child = await fetchSanity(query, false);
    return child['parents'][0] ?? [];
}

/**
 * Fetch the Methods (learning-paths) for a specific brand.
 * @param {string} brand - The brand for which to fetch methods.
 * @returns {Promise<Object|null>} - The fetched methods data or null if not found.
 */
export async function fetchMethods(brand) {
    const query = `*[_type == 'learning-path' && brand == '${brand}'] {
      ${getFieldsForContentType()}
    } | order(published_on asc)`
    return fetchSanity(query, true);
}

/**
 * Fetch the Foundations 2019.
 * @param {string} slug - The slug of the method.
 * @returns {Promise<Object|null>} - The fetched foundation data or null if not found.
 */
export async function fetchFoundation(slug) {
    const filterParams = {};
    const query = await buildQuery(
        `_type == 'foundation' && slug.current == "${slug}"`,
        filterParams,
        getFieldsForContentType('foundation'),
        {
            sortOrder: 'published_on asc',
            isSingle: true,
        }
    );
    return fetchSanity(query, false);
}

/**
 * Fetch the Method (learning-paths) for a specific brand.
 * @param {string} brand - The brand for which to fetch methods.
 * @param {string} slug - The slug of the method.
 * @returns {Promise<Object|null>} - The fetched methods data or null if not found.
 */
export async function fetchMethod(brand, slug) {
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
    "type": _type,
    "permission_id": permission[]->railcontent_id,
    "levels": child[]->
      {
        "id": railcontent_id,
        published_on,
        child_count,
        difficulty,
        difficulty_string,
        "thumbnail_url": thumbnail.asset->url,
        "instructor": instructor[]->{name},
        title,
        "type": _type,
        "description": ${descriptionField},
        "url": web_url_path,
        web_url_path,
        xp,
      }
  } | order(published_on asc)`
    return fetchSanity(query, false);
}

/**
 * Fetch the child courses for a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next lesson data or null if not found.
 */
export async function fetchMethodChildren(railcontentId) {
    const query = `*[railcontent_id == ${railcontentId}]{
    child_count,
    "id": railcontent_id,
    "description": ${descriptionField},
    title,
    xp,
    total_xp,
    'children': child[]->{
        ${getFieldsForContentType('method')}
    },
  }[0..1]`;
    return fetchSanity(query, true);
}

/**
 * Fetch the next lesson for a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @param {string} methodId - The RailcontentID of the method
 * @returns {Promise<Object|null>} - The fetched next lesson data or null if not found.
 */
export async function fetchMethodNextLesson(railcontentId, methodId) {
    const sortedChildren = await fetchMethodChildrenIds(methodId);
    const index = sortedChildren.indexOf(railcontentId);
    const childIndex = sortedChildren[index + 1];
    return childIndex ? await fetchByRailContentId(childIndex) : null;
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
    const sortedChildren = await fetchMethodChildrenIds(methodId);
    const index = sortedChildren.indexOf(Number(railcontentId));
    let nextId = sortedChildren[index + 1];
    let previousId = sortedChildren[index - 1];
    let nextPrev = await fetchByRailContentIds([nextId, previousId]);
    const nextLesson = nextPrev.find((elem) => {
        return elem['id'] === nextId
    });
    const prevLesson = nextPrev.find((elem) => {
        return elem['id'] === previousId
    });
    return {nextLesson, prevLesson};
}

/**
 * Fetch all children of a specific method by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the method.
 * @returns {Promise<Array<Object>|null>} - The fetched children data or null if not found.
 */
export async function fetchMethodChildrenIds(railcontentId) {
    const query = `*[ railcontent_id == ${railcontentId}]{
    'children': child[]-> {
        'id': railcontent_id,
        'type' : _type,
            'children': child[]-> {
                'id': railcontent_id,
                'type' : _type,
                    'children': child[]-> {
                        'id': railcontent_id,
                        'type' : _type,
            }
        }
    }
}`;
    let allChildren = await fetchSanity(query, false);
    return getChildrenToDepth(allChildren, 4);
}

function getChildrenToDepth(parent, depth = 1) {
    let allChildrenIds = [];
    if (parent && parent['children'] && depth > 0) {
        parent['children'].forEach((child) => {
            if (!child['children']) {
                allChildrenIds.push(child['id']);
            }
            allChildrenIds = allChildrenIds.concat(getChildrenToDepth(child, depth - 1));
        })
    }
    return allChildrenIds;
}

/**
 * Fetch the next and previous lessons for a specific lesson by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next and previous lesson data or null if found.
 */
export async function fetchNextPreviousLesson(railcontentId) {
    const document = await fetchLessonContent(railcontentId);
    if (document.parent_content_data && document.parent_content_data.length > 0) {
        const lastElement = document.parent_content_data[document.parent_content_data.length - 1];
        const results = await fetchMethodPreviousNextLesson(railcontentId, lastElement.id);
        return results;
    }
    const processedData = processMetadata(document.brand, document.type, true);
    let sortBy = processedData?.sortBy ?? 'published_on';
    const isDesc = sortBy.startsWith('-');
    sortBy = isDesc ? sortBy.substring(1) : sortBy;
    const sortValue = document[sortBy];
    const isNumeric = !isNaN(sortValue);
    let prevComparison = isNumeric ? `${sortBy} <= ${sortValue}` : `${sortBy} <= "${sortValue}"`;
    let nextComparison = isNumeric ? `${sortBy} >= ${sortValue}` : `${sortBy} >= "${sortValue}"`;
    const fields = getFieldsForContentType(document.type);
    const query = `{
      "prevLesson": *[brand == "${document.brand}" && status == "${document.status}" && _type == "${document.type}" && ${prevComparison} && railcontent_id != ${railcontentId}] | order(${sortBy} desc){${fields}}[0...1][0],
      "nextLesson": *[brand == "${document.brand}" && status == "${document.status}" && _type == "${document.type}" && ${nextComparison} && railcontent_id != ${railcontentId}] | order(${sortBy} asc){${fields}}[0...1][0]
    }`;

    return await fetchSanity(query, true);
}

/**
 * Fetch the page data for a specific lesson by Railcontent ID.
 * @param {string} railContentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched page data or null if found.
 *
 * @example
 * fetchLessonContent('lesson123')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchLessonContent(railContentId) {
    const filterParams = {isSingle:true};
    // Format changes made to the `fields` object may also need to be reflected in Musora-web-platform SanityGateway.php $fields object
    // Currently only for challenges and challenge lessons
    // If you're unsure, message Adrian, or just add them.
    const fields = `title, 
          published_on,
          "type":_type, 
          "resources": resource, 
          difficulty, 
          difficulty_string, 
          brand, 
          status,
          soundslice, 
          instrumentless, 
          railcontent_id, 
          "id":railcontent_id, 
          slug, artist->,
          "thumbnail_url":thumbnail.asset->url, 
          "url": web_url_path, 
          soundslice_slug,
          "description": description[0].children[0].text,
          "chapters": chapter[]{
            chapter_description,
            chapter_timecode,
            "chapter_thumbnail_url": chapter_thumbnail_url.asset->url
          },
          "instructors":instructor[]->name,
          "instructor": instructor[]->{
            "id":railcontent_id,
            name,
            short_bio,
            "biography": short_bio[0].children[0].text, 
            web_url_path,
            "coach_card_image": coach_card_image.asset->url,
            "coach_profile_image":thumbnail_url.asset->url
          },
          ${assignmentsField}
          video,
          length_in_seconds,
          mp3_no_drums_no_click_url,
          mp3_no_drums_yes_click_url,
          mp3_yes_drums_no_click_url,
          mp3_yes_drums_yes_click_url,
          "permission_id": permission[]->railcontent_id,
          parent_content_data,
          sort,
          xp`;
    const query = await buildQuery(
        `railcontent_id == ${railContentId}`,
        filterParams,
        fields,
        {
            isSingle: true,
        }
    );
    return fetchSanity(query, false);
}

/**
 * Fetch related lessons for a specific lesson by RailContent ID and type.
 * @param {string} railContentId - The RailContent ID of the current lesson.
 * @param {string} brand - The current brand.
 * @returns {Promise<Array<Object>|null>} - The fetched related lessons data or null if not found.
 */
export async function fetchRelatedLessons(railContentId, brand) {
    const query = `*[railcontent_id == ${railContentId} && brand == "${brand}" && references(*[_type=='permission']._id)]{
   _type, parent_type, railcontent_id,
    "related_lessons" : array::unique([
      ...(*[references(^._id)][0].child[]->{_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail_url":thumbnail.asset->url, length_in_seconds, web_url_path, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type}),
      ...(*[_type=="song" && _type==^._type && brand == "${brand}" && references(^.artist->_id) && railcontent_id !=${railContentId}]{_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail_url":thumbnail.asset->url, length_in_seconds, web_url_path, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type}|order(published_on desc, title asc)[0...10]),
      ...(*[_type=="song" && _type==^._type && brand == "${brand}" && references(^.genre[]->_id) && railcontent_id !=${railContentId}]{_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail_url":thumbnail.asset->url, length_in_seconds, web_url_path, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type}|order(published_on desc, title asc)[0...10]),
      ...(*[_type==^._type &&  _type in ${JSON.stringify(typeWithSortOrder)} && brand == "${brand}" && railcontent_id !=${railContentId}]{_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail_url":thumbnail.asset->url, length_in_seconds, web_url_path, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type, sort}|order(sort asc, title asc)[0...10]),
      ...(*[_type==^._type && !(_type in ${JSON.stringify(typeWithSortOrder)}) && !(defined(parent_type)) && brand == "${brand}" && railcontent_id !=${railContentId}]{_id, "id":railcontent_id, published_on, "instructor": instructor[0]->name, title, "thumbnail_url":thumbnail.asset->url, length_in_seconds, web_url_path, "type": _type, difficulty, difficulty_string, railcontent_id, artist->,"permission_id": permission[]->railcontent_id,_type}|order(published_on desc, title asc)[0...10]),
      ])[0...10]}`;
    return fetchSanity(query, false);
}

/**
 * Fetch related method lessons for a specific lesson by RailContent ID and type.
 * @param {string} railContentId - The RailContent ID of the current lesson.
 * @param {string} brand - The current brand.
 * @returns {Promise<Array<Object>|null>} - The fetched related lessons
 */
export async function fetchRelatedMethodLessons(railContentId, brand) {
    const query = `*[railcontent_id == ${railContentId} && brand == "${brand}"]{
      "id":_id,
      "related_lessons": *[references(^._id)][0].child[]->{
        "id": railcontent_id,
        "type": _type,
        title,
        "description": description[0].children[0].text, // Extraer texto plano
        "thumbnail_url": thumbnail.asset->url,
        "url": web_url_path,
        difficulty,
        difficulty_string,
      }
    }
  }`
    return fetchSanity(query, false);
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
export async function fetchAllPacks(brand, sort = "-published_on", searchTerm = "", page = 1, limit = 10) {
    const sortOrder = getSortOrder(sort);
    const filter = `_type == 'pack' && brand == '${brand}' && title match "${searchTerm}*"`
    const filterParams = {};
    const fields = getFieldsForContentType('pack');
    const start = (page - 1) * limit;
    const end = start + limit;

    const query = await buildQuery(
        filter,
        filterParams,
        getFieldsForContentType('pack'),
        {
            logo_image_url: 'logo_image_url.asset->url',
            sortOrder: sortOrder,
            start,
            end
        }
    );
    return fetchSanity(query, true);
}

/**
 * Fetch all content for a specific pack by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the pack.
 * @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
 */
export async function fetchPackAll(railcontentId) {
    return fetchByRailContentId(railcontentId, 'pack');
}

export async function fetchLiveEvent(brand) {
    //calendarIDs taken from addevent.php
    // TODO import instructor calendars to Sanity
    let defaultCalendarID = '';
    switch (brand) {
        case ('drumeo'):
            defaultCalendarID = 'GP142387';
            break;
        case ('pianote'):
            defaultCalendarID = 'be142408';
            break;
        case ('guitareo'):
            defaultCalendarID = 'IJ142407';
            break;
        case ('singeo'):
            defaultCalendarID = 'bk354284';
            break;
        default:
            break;
    }
    let dateTemp = new Date();
    dateTemp.setDate(dateTemp.getDate() - 1);

    // See LiveStreamEventService.getCurrentOrNextLiveEvent for some nice complicated logic which I don't think is actually importart
    // this has some +- on times
    // But this query just finds the first scheduled event (sorted by start_time) that ends after now()
    const query = `*[status == 'scheduled' && defined(live_event_start_time) && published_on > '${getSanityDate(dateTemp)}' && live_event_end_time >= '${getSanityDate(new Date())}']{
      'slug': slug.current,
      'id': railcontent_id,
      live_event_start_time,
      live_event_end_time,
      railcontent_id,
      published_on,
      'event_coach_url' : instructor[0]->web_url_path,
      'event_coach_calendar_id': coalesce(calendar_id, '${defaultCalendarID}'),
      title,
      "image": thumbnail.asset->url,
      "instructors": instructor[]->{
            name,
            web_url_path,
          },
      'videoId': coalesce(live_event_youtube_id, video.external_id),
    } | order(live_event_start_time)[0...1]`;
    return await fetchSanity(query, false);
}

/**
 * Fetch all children of a specific pack by Railcontent ID.
 * @param {string} railcontentId - The Railcontent ID of the pack.
 * @returns {Promise<Array<Object>|null>} - The fetched pack children data or null if not found.
 *
 * @example
 * fetchPackChildren('pack123')
 *   .then(children => console.log(children))
 *   .catch(error => console.error(error));
 */
export async function fetchPackChildren(railcontentId) {
    return fetchChildren(railcontentId, 'pack-children');
}

/**
 * Fetch the data needed for the Pack Overview screen.
 * @param {number} id - The Railcontent ID of the pack
 * @returns {Promise<Object|null>} - The pack information and lessons or null if not found.
 *
 * @example
 * fetchPackData(404048)
 *   .then(challenge => console.log(challenge))
 *   .catch(error => console.error(error));
 */
export async function fetchPackData(id) {
    const query = `*[railcontent_id == ${id}]{
    ${getFieldsForContentType("pack")}
  } [0...1]`;
    return fetchSanity(query, false);
}

/**
 * Fetch the data needed for the Challenge Overview screen.
 * @param {string} id - The Railcontent ID of the course
 * @returns {Promise<Object|null>} - The challenge information and lessons or null if not found.
 *
 * @example
 * fetchChallengeOverview('challenge123')
 *   .then(challenge => console.log(challenge))
 *   .catch(error => console.error(error));
 */
export async function fetchChallengeOverview(id) {
    // WIP
    const query = `*[railcontent_id == ${id}]{
    ${getFieldsForContentType("challenge")}
  } [0...1]`;
    return fetchSanity(query, false);
}

/**
 * Fetch the data needed for the coach screen.
 * @param {string} brand - The brand for which to fetch coach lessons
 * @param {string} id - The Railcontent ID of the coach
 * @returns {Promise<Object|null>} - The lessons for the instructor or null if not found.
 * @param {Object} params - Parameters for pagination, filtering and sorting.
 * @param {string} [params.sortOrder="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter content by title.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 *
 * @example
 * fetchCoachLessons('coach123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchCoachLessons(brand, id, {
    sortOrder = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 20,
    includedFields = [],
} = {}) {
    const fieldsString = getFieldsForContentType();
    const start = (page - 1) * limit;
    const end = start + limit;
    const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
    const includedFieldsFilter = includedFields.length > 0
        ? filtersToGroq(includedFields)
        : "";
    const filter = `brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='instructor' && railcontent_id == ${id}]._id)`;

    sortOrder = getSortOrder(sortOrder);
    const query = buildEntityAndTotalQuery(
        filter,
        fieldsString,
        {
            sortOrder: sortOrder,
            start: start,
            end: end,
        },
    );
    return fetchSanity(query, true);
}

/**
 * Fetch the data needed for the Course Overview screen.
 * @param {string} id - The Railcontent ID of the course
 * @returns {Promise<Object|null>} - The course information and lessons or null if not found.
 *
 * @example
 * fetchCourseOverview('course123')
 *   .then(course => console.log(course))
 *   .catch(error => console.error(error));
 */
export async function fetchCourseOverview(id) {
    return fetchByRailContentId(id, 'course');
}

/**
 * Fetch the data needed for the Course Overview screen.
 * @param {string} id - The Railcontent ID of the course
 * @returns {Promise<Object|null>} - The course information and lessons or null if not found.
 *
 * @example
 * fetchParentForDownload('course123')
 *   .then(course => console.log(course))
 *   .catch(error => console.error(error));
 */
export async function fetchParentForDownload(id) {
    const query = buildRawQuery(
        `railcontent_id == ${id}`,
        getFieldsForContentType('parent-download'),
        {
            isSingle: true,
        },
    );

    return fetchSanity(query, false);
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
export async function fetchByReference(brand, {
    sortOrder = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 20,
    includedFields = [],
} = {}) {
    const fieldsString = getFieldsForContentType();
    const start = (page - 1) * limit;
    const end = start + limit;
    const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : '';
    const includedFieldsFilter = includedFields.length > 0
        ? includedFields.join(' && ')
        : "";
    const filter = `brand == '${brand}' ${searchFilter} && references(*[${includedFieldsFilter}]._id)`;
    const query = buildEntityAndTotalQuery(
        filter,
        fieldsString,
        {
            sortOrder: getSortOrder(sortOrder),
            start: start,
            end: end,
        },
    );
    return fetchSanity(query, true);
}

/**
 * Fetch the artist's lessons.
 * @param {string} brand - The brand for which to fetch lessons.
 * @param {string} name - The name of the artist
 * @param {string} contentType - The type of the lessons we need to get from the artist. If not defined, groq will get lessons from all content types
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds] - The ids of the lessons that are in progress or completed
 * @returns {Promise<Object|null>} - The lessons for the artist and some details about the artist (name and thumbnail).
 *
 * @example
 * fetchArtistLessons('drumeo', '10 Years', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistLessons(brand, name, contentType, {
    sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 10,
    includedFields = [],
    progressIds = undefined,
} = {}) {

    const fieldsString = DEFAULT_FIELDS.join(',');
    const start = (page - 1) * limit;
    const end = start + limit;
    const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
    const sortOrder = getSortOrder(sort);
    const addType = contentType && Array.isArray(contentType) ? `_type in ['${contentType.join("', '")}'] &&` : contentType ? `_type == '${contentType}' && ` : ''
    const includedFieldsFilter = includedFields.length > 0
        ? filtersToGroq(includedFields)
        : "";

    // limits the results to supplied progressIds for started & completed filters
    const progressFilter = progressIds !== undefined ? `&& railcontent_id in [${progressIds.join(',')}]` : "";

    const query = `{
    "entity": 
      *[_type == 'artist' && name == '${name}']
        {'type': _type, name, 'thumbnail_url':thumbnail_url.asset->url, 
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]), 
        'lessons': *[${addType} brand == '${brand}' && references(^._id) ${searchFilter} ${includedFieldsFilter} ${progressFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`;
    return fetchSanity(query, true);
}

/**
 * Fetch the genre's lessons.
 * @param {string} brand - The brand for which to fetch lessons.
 * @param {string} name - The name of the genre
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds] - The ids of the lessons that are in progress or completed
 * @returns {Promise<Object|null>} - The lessons for the artist and some details about the artist (name and thumbnail).
 *
 * @example
 * fetchGenreLessons('drumeo', 'Blues', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(brand, name, contentType, {
    sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 10,
    includedFields = [],
    progressIds = undefined,
} = {}) {
    const fieldsString = DEFAULT_FIELDS.join(',');
    const start = (page - 1) * limit;
    const end = start + limit;
    const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
    const sortOrder = getSortOrder(sort);
    const addType = contentType ? `_type == '${contentType}' && ` : ''
    const includedFieldsFilter = includedFields.length > 0
        ? filtersToGroq(includedFields)
        : "";
    // limits the results to supplied progressIds for started & completed filters
    const progressFilter = progressIds !== undefined ? `&& railcontent_id in [${progressIds.join(',')}]` : "";

    const query = `{
    "entity": 
      *[_type == 'genre' && name == '${name}']
        {'type': _type, name, 'thumbnail_url':thumbnail_url.asset->url, 
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]), 
        'lessons': *[${addType} brand == '${brand}' && references(^._id) ${searchFilter} ${includedFieldsFilter} ${progressFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`;
    return fetchSanity(query, true);
}

export async function fetchTopLevelParentId(railcontentId) {
    const query = `*[railcontent_id == ${railcontentId}]{
      railcontent_id,
      'parents': *[^._id in child[]._ref && !(_id in path('drafts.**'))]{
        railcontent_id,
          'parents': *[^._id in child[]._ref && !(_id in path('drafts.**'))]{
            railcontent_id,
            'parents': *[^._id in child[]._ref && !(_id in path('drafts.**'))]{
              railcontent_id,
               'parents': *[^._id in child[]._ref && !(_id in path('drafts.**'))]{
                  railcontent_id,               
            } 
          }
        }
      }
    }`;
    let response = await fetchSanity(query, false, {processNeedAccess: false});
    if (!response) return null;
    let currentLevel = response;
    for (let i = 0; i < 4; i++) {
        if (currentLevel['parents'].length > 0) {
            currentLevel = currentLevel['parents'][0];
        } else {
            return currentLevel['railcontent_id'];
        }
    }
    return null;
}

export async function fetchHierarchy(railcontentId) {
    let topLevelId = await fetchTopLevelParentId(railcontentId);
    const query = `*[railcontent_id == ${topLevelId}]{
      railcontent_id,
      'assignments': assignment[]{railcontent_id},
      'children': child[]->{
        railcontent_id,
        'assignments': assignment[]{railcontent_id},
        'children': child[]->{
            railcontent_id,
            'assignments': assignment[]{railcontent_id},
            'children': child[]->{
               railcontent_id,
               'assignments': assignment[]{railcontent_id},
               'children': child[]->{
                  railcontent_id,                
            } 
          }
        }
      },
    }`;
    let response = await fetchSanity(query, false, {processNeedAccess: false});
    if (!response) return null;
    let data = {
        parents: {},
        children: {}
    };
    populateHierarchyLookups(response, data, null);
    return data;
}


function populateHierarchyLookups(currentLevel, data, parentId) {
    let contentId = currentLevel['railcontent_id'];
    let children = currentLevel['children'];

    data.parents[contentId] = parentId;
    if (children) {
        data.children[contentId] = children.map(child => child['railcontent_id']);
        for (let i = 0; i < children.length; i++) {
            populateHierarchyLookups(children[i], data, contentId);
        }
    } else {
        data.children[contentId] = [];
    }

    let assignments = currentLevel['assignments'];
    if (assignments) {
        let assignmentIds = assignments.map(assignment => assignment['railcontent_id']);
        data.children[contentId] = (data.children[contentId] ?? []).concat(assignmentIds);
        assignmentIds.forEach(assignmentId => {
            data.parents[assignmentId] = contentId;
        });
    }

}

/**
 * Fetch assignments for content
 *
 * @param {integer} contentId - List of ids get data for
 * @returns {Promise<array|null>} - A promise that resolves to an array containing the data
 */
export async function fetchAssignments(contentId) {
    const fields = `"id": railcontent_id,"assignments":assignment[]{"id": railcontent_id}`;
    const query = await buildQuery(`railcontent_id == ${contentId}`,
        {bypassPermissions: true},
        fields,
        {end: 100});
    let data = await fetchSanity(query, false);
    let mapped = [];
    data.assignments.forEach(function (content) {
        mapped.push(content.id);
    });
    return mapped;
}

/**
 * Fetch data for comment mod page
 *
 * @param {array} ids - List of ids get data for
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the data
 */
export async function fetchCommentModContentData(ids) {
    const idsString = ids.join(',');
    const fields = `"id": railcontent_id, "type": _type, title, "url": web_url_path, "parent": *[^._id in child[]._ref]{"id": railcontent_id, title}`;
    const query = await buildQuery(`railcontent_id in [${idsString}]`,
        {bypassPermissions: true},
        fields,
        {end: 50});
    let data = await fetchSanity(query, true);
    let mapped = {};
    data.forEach(function (content) {
        mapped[content.id] = {
            "id": content.id,
            "type": content.type,
            "title": content.title,
            "url": content.url,
            "parentTitle": content.parent[0]?.title ?? null
        };
    });
    return mapped;
}


/**
 *
 * @param {string} query - The GROQ query to execute against the Sanity API.
 * @param {boolean} isList - Whether to return an array or a single result.
 * @param {Function} [customPostProcess=null] - custom post process callback
 * @param {boolean} [processNeedAccess=true] - execute the needs_access callback
 * @returns {Promise<*|null>} - A promise that resolves to the fetched data or null if an error occurs or no results are found.
 *
 * @example
 * const query = `*[_type == "song"]{title, artist->name}`;
 * fetchSanity(query, true)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */

export async function fetchSanity(query,
                                  isList,
                                  {
                                      customPostProcess = null,
                                      processNeedAccess = true,
                                  } = {}
) {
    // Check the config object before proceeding
    if (!checkSanityConfig(globalConfig)) {
        return null;
    }

    if (globalConfig.sanityConfig.debug) {
        console.log("fetchSanity Query:", query);
    }
    const perspective = globalConfig.sanityConfig.perspective ?? 'published';
    const encodedQuery = encodeURIComponent(query);
    const api = globalConfig.sanityConfig.useCachedAPI ? 'apicdn' : 'api';
    const url = `https://${globalConfig.sanityConfig.projectId}.${api}.sanity.io/v${globalConfig.sanityConfig.version}/data/query/${globalConfig.sanityConfig.dataset}?perspective=${perspective}&query=${encodedQuery}`;
    const headers = {
        'Authorization': `Bearer ${globalConfig.sanityConfig.token}`,
        'Content-Type': 'application/json'
    };

    try {
        let promisesResult = await Promise.all([
            fetch(url, {headers}),
            processNeedAccess ? fetchUserPermissions() : null
        ]);
        const response = promisesResult[0];
        const userPermissions = promisesResult[1]?.permissions;

        if (!response.ok) {
            throw new Error(`Sanity API error: ${response.status} - ${response.statusText}`);
        }
        const result = await response.json();
        if (result.result) {
            if (globalConfig.sanityConfig.debug) {
                console.log("fetchSanity Results:", result);
            }
            let results = isList ? result.result : result.result[0];
            results = processNeedAccess ? await needsAccessDecorator(results, userPermissions) : results;
            return customPostProcess ? customPostProcess(results) : results;
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('fetchSanity: Fetch error:', error);
        return null;
    }
}

function needsAccessDecorator(results, userPermissions) {
    if (globalConfig.sanityConfig.useDummyRailContentMethods) return results;

    userPermissions = new Set(userPermissions);

    if (Array.isArray(results)) {
        results.forEach((result) => {
            result['need_access'] = doesUserNeedAccessToContent(result, userPermissions);
        });
    } else if (results.entity && Array.isArray(results.entity)) {
        // Group By
        results.entity.forEach((result) => {
            if (result.lessons) {
                result.lessons.forEach((lesson) => {
                    lesson['need_access'] = doesUserNeedAccessToContent(lesson, userPermissions); // Updated to check lesson access
                });
            } else {
                result['need_access'] = doesUserNeedAccessToContent(result, userPermissions);
            }
        });
    } else if (results.related_lessons && Array.isArray(results.related_lessons)) {
        results.related_lessons.forEach((result) => {
            result['need_access'] = doesUserNeedAccessToContent(result, userPermissions);
        })
    } else {
        results['need_access'] = doesUserNeedAccessToContent(results, userPermissions);
    }

    return results;
}

function doesUserNeedAccessToContent(result, userPermissions) {
    const permissions = new Set(result?.permission_id ?? []);
    if (permissions.size === 0) {
        return false;
    }
    for (let permission of permissions) {
        if (userPermissions.has(permission)) {
            return false;
        }
    }
    return true;
}

/**
 * Fetch CatalogueMetadata from Sanity. This information may be duplicated in the contentTypeConfig.js.
 * It's an ongoing discussion (Aug 2024), but it's been included here if necessary
 *
 * @param {string} contentType - name of the contentype to pull
 * @returns {Promise<Object|null>} - A promise that resolves to the fetched data or null if an error occurs or no results are found.
 *
 * @example
 *
 * fetchCatalogMetadata('song')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchCatalogMetadata(contentType) {
    const query = `*[_type == 'CatalogMetadata']{
        catalog_type,
        brand,
        groq_results,
        groq_search_fields,
        meta_data_groq,
        modal_text,
        sort_by,
      }`
    return fetchSanity(query, false, {processNeedAccess: false});
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
    let shows = showsTypes[brand] ?? [];
    const showsInfo = [];

    shows.forEach(type => {
        const processedData = processMetadata(brand, type);
        if (processedData) showsInfo.push(processedData)
    });

    return showsInfo;
}

/**
 * Fetch metadata from the contentMetaData.js based on brand and type.
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
    const processedData = processMetadata(brand, type, true);
    return processedData ? processedData : {};
}


//Helper Functions
function arrayJoinWithQuotes(array, delimiter = ',') {
    const wrapped = array.map(value => `'${value}'`);
    return wrapped.join(delimiter)
}

function getSanityDate(date) {
    return date.toISOString();
}

const merge = (a, b, predicate = (a, b) => a === b) => {
    const c = [...a]; // copy to avoid side effects
    // add all items from B to copy C if they're not already present
    b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
    return c;
}

function checkSanityConfig(config) {
    if (!config.sanityConfig.token) {
        console.warn('fetchSanity: The "token" property is missing in the config object.');
        return false;
    }
    if (!config.sanityConfig.projectId) {
        console.warn('fetchSanity: The "projectId" property is missing in the config object.');
        return false;
    }
    if (!config.sanityConfig.dataset) {
        console.warn('fetchSanity: The "dataset" property is missing in the config object.');
        return false;
    }
    if (!config.sanityConfig.version) {
        console.warn('fetchSanity: The "version" property is missing in the config object.');
        return false;
    }
    return true;
}


function buildRawQuery(
    filter = '',
    fields = '...',
    {
        sortOrder = 'published_on desc',
        start = 0,
        end = 10,
        isSingle = false,
    }
) {
    const sortString = sortOrder ? `order(${sortOrder})` : '';
    const countString = isSingle ? '[0...1]' : `[${start}...${end}]`;
    const query = `*[${filter}]{
        ${fields}
    } | ${sortString}${countString}`
    return query;
}


async function buildQuery(
    baseFilter = '',
    filterParams = {},
    fields = '...',
    {
        sortOrder = 'published_on desc',
        start = 0,
        end = 10,
        isSingle = false,
    },
) {
    const filter = await new FilterBuilder(baseFilter, filterParams).buildFilter();
    return buildRawQuery(filter, fields, {sortOrder, start, end, isSingle});
}

function buildEntityAndTotalQuery(
    filter = '',
    fields = '...',
    {
        sortOrder = 'published_on desc',
        start = 0,
        end = 10,
        isSingle = false,
    },
) {
    const sortString = sortOrder ? `order(${sortOrder})` : '';
    const countString = isSingle ? '[0...1]' : `[${start}...${end}]`;
    const query = `{
      "entity": *[${filter}] | ${sortString}${countString} 
      {
        ${fields}
      },
      "total": count(*[${filter}])
    }`;
    return query;
}


function getFilterOptions(option, commonFilter, contentType, brand) {
    let filterGroq = '';
    const types = Array.from(new Set([...coachLessonsTypes, ...showsTypes[brand]]));

    switch (option) {
        case "difficulty":
            filterGroq = ` 
                "difficulty": [
        {"type": "Introductory", "count": count(*[${commonFilter} && difficulty_string == "Introductory"])},
        {"type": "Beginner", "count": count(*[${commonFilter} && difficulty_string == "Beginner"])},
        {"type": "Intermediate", "count": count(*[${commonFilter} && difficulty_string == "Intermediate" ])},
        {"type": "Advanced", "count": count(*[${commonFilter} && difficulty_string == "Advanced" ])},
        {"type": "Expert", "count": count(*[${commonFilter} && difficulty_string == "Expert" ])}
        ][count > 0],`;
            break;
        case "type":
            const dynamicTypeOptions = types.map(filter => {
                return `{"type": "${filter}", "count": count(*[${commonFilter} && _type == "${filter}"])}`
            }).join(', ');
            filterGroq = `"type": [${dynamicTypeOptions}][count > 0],`;
            break;
        case "genre":
        case "essential":
        case "focus":
        case "theory":
        case "topic":
        case "lifestyle":
        case "creativity":
            filterGroq = `
            "${option}": *[_type == '${option}' ${contentType ? ` && '${contentType}' in filter_types` : ''} ] {
            "type": name,
                "count": count(*[${commonFilter} && references(^._id)])
        }[count > 0],`;
            break;
        case "instrumentless":
            filterGroq = `
            "${option}":  [
                  {"type": "Full Song Only", "count": count(*[${commonFilter} && instrumentless == false ])},
                  {"type": "Instrument Removed", "count": count(*[${commonFilter} && instrumentless == true ])}
              ][count > 0],`;
            break;
        case "gear":
            filterGroq = `
            "${option}":  [
                  {"type": "Practice Pad", "count": count(*[${commonFilter} && gear match 'Practice Pad' ])},
                  {"type": "Drum-Set", "count": count(*[${commonFilter} && gear match 'Drum-Set'])}
              ][count > 0],`;
            break;
        case "bpm":
            filterGroq = `
            "${option}":  [
                  {"type": "50-90", "count": count(*[${commonFilter} && bpm > 50 && bpm < 91])},
                  {"type": "91-120", "count": count(*[${commonFilter} && bpm > 90 && bpm < 121])},
                  {"type": "121-150", "count": count(*[${commonFilter} && bpm > 120 && bpm < 151])},
                  {"type": "151-180", "count": count(*[${commonFilter} && bpm > 150 && bpm < 181])},
                  {"type": "180+", "count": count(*[${commonFilter} && bpm > 180])},
              ][count > 0],`;
            break;
        default:
            filterGroq = "";
            break;
    }

    return filterGroq;
}

function cleanUpGroq(query) {
    // Split the query into clauses based on the logical operators
    const clauses = query.split(/(\s*&&|\s*\|\|)/).map(clause => clause.trim());

    // Filter out empty clauses
    const filteredClauses = clauses.filter(clause => clause.length > 0);

    // Check if there are valid conditions in the clauses
    const hasConditions = filteredClauses.some(clause => !clause.match(/^\s*&&\s*|\s*\|\|\s*$/));

    if (!hasConditions) {
        // If no valid conditions, return an empty string or the original query
        return '';
    }

    // Remove occurrences of '&& ()'
    const cleanedQuery = filteredClauses.join(' ')
        .replace(/&&\s*\(\)/g, '')
        .replace(/(\s*&&|\s*\|\|)(?=\s*[\s()]*$|(?=\s*&&|\s*\|\|))/g, '')
        .trim();

    return cleanedQuery;
}





