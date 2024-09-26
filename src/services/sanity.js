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
    contentMetadata,
    getNewReleasesTypes,
} from "../contentTypeConfig";
import {globalConfig} from "./config";

import { fetchAllCompletedStates, fetchCurrentSongComplete } from './railcontent.js';
import {arrayToStringRepresentation, FilterBuilder} from "../filterBuilder";

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
    const query = buildQuery(
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
  const filter = new FilterBuilder(`_type == "song" && brand == "${brand}" && references(^._id)`).buildFilter();
  const query = `
  *[_type == "artist"]{
    name,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0]`;
  return fetchSanity(query, true);
}

/**
* Fetch current number of artists for songs within a brand.
* @param {string} brand - The current brand.
* @returns {Promise<int|null>} - The fetched count of artists.
*/
export async function fetchSongArtistCount(brand) {
  const query = `count(*[_type == 'artist']{'lessonsCount': count(*[_type == 'song' && brand == '${brand}' && references(^._id)]._id)}[lessonsCount > 0])`;
  return fetchSanity(query, true);
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
        "data": array::unique([
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
  return fetchSanity(query, true);
}

/**
 * Fetch the latest workouts for a specific brand, including completion status and progress.
 * This function retrieves up to five of the latest workout content for a given brand, sorted in descending order by their publication date.
 * It also includes completion status and progress percentage for each workout by fetching additional data about user progress.
 *
 * @param {string} brand - The brand for which to fetch workouts (e.g., 'drumeo', 'pianote').
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of workout data objects with additional properties for completion status and progress percentage, or null if no workouts are found.
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
export async function fetchNewReleases(brand, { page = 1, limit = 20, sort="-published_on" } = {}) {
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
      web_url_path,`;
  const filterParams = {};
  const query = buildQuery(
      filter,
      filterParams,
      fields,
      {
          sortOrder: sortOrder,
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
export async function fetchUpcomingEvents(brand, { page = 1, limit = 10 } = {}) {
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
        web_url_path,`;
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
export async function fetchScheduledReleases(brand, { page = 1, limit = 10 }) {
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
} = {}) {
    let config = contentTypeConfig[type] ?? {};
    let additionalFields = config?.fields ?? [];
    let isGroupByOneToOne = (groupBy ? config?.relationships?.[groupBy]?.isOneToOne : false) ?? false;
    let webUrlPathType = config?.slug ?? type;
    const start = (page - 1) * limit;
    const end = start + limit;

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
    const progressFilter = progressIds !== undefined ?
        `&& railcontent_id in [${progressIds.join(',')}]` : "";

    // Determine the sort order
    const sortOrder = getSortOrder(sort);

    let fields = useDefaultFields ?  customFields.concat(DEFAULT_FIELDS, additionalFields) : customFields;
    let fieldsString = fields.join(',');

    // Determine the group by clause
    let query = "";
    let entityFieldsString = "";
    let filter = "";
    if (groupBy !== "" && isGroupByOneToOne) {
        const webUrlPath = 'artists';
        const lessonsFilter = `_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter} ${progressFilter}`;
        entityFieldsString = `
                'id': _id,
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
        const webUrlPath = (groupBy == 'genre')?'/genres':'';
        const lessonsFilter = `brand == '${brand}' && ^._id in ${groupBy}[]._ref ${typeFilter} ${searchFilter} ${includedFieldsFilter} ${progressFilter}`;
        entityFieldsString = `
                'id': _id,
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
    query = buildEntityAndTotalQuery(
        filter,
        entityFieldsString,
        {
            sortOrder: sortOrder,
            start: start,
            end: end,
        });

    return fetchSanity(query, true);
}

export function getSortOrder(sort= '-published_on', groupBy)
{
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
* Fetches all available filter options based on various criteria such as brand, filters, style, artist, content type, and search term.
*
* This function constructs a query to retrieve the total number of results and filter options such as difficulty, instrument type, and genre.
* The filter options are dynamically generated based on the provided filters, style, artist, and content type.
*
* @param {string} brand - The brand for which to fetch the filter options.
* @param {string[]} filters - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock']
* @param {string} [style] - Optional style or genre to filter the results. If provided, the query will check if the style exists in the genre array.
* @param {string} [artist] - Optional artist name to filter the results. If provided, the query will check if the artist's name matches.
* @param {string} contentType - The content type to fetch (e.g., 'song', 'lesson').
* @param {string} [term] - Optional search term to match against various fields such as title, album, artist name, and genre.
* @param {Array<string>} [progressIds=undefined] - An array of railcontent IDs to filter the results by. Used for filtering by progress.
* @returns {Promise<Object|null>} - A promise that resolves to an object containing the total results and filter options, or null if the query fails.
*
* @example
* // Example usage:
* fetchAllFilterOptions('myBrand', '', 'Rock', 'John Doe', 'song', 'Love')
*   .then(options => console.log(options))
*   .catch(error => console.error(error));
*/
export async function fetchAllFilterOptions(
    brand,
    filters,
    style,
    artist,
    contentType,
    term,
    progressIds = undefined
) {
    const includedFieldsFilter = filters?.length > 0 ? filtersToGroq(filters) : undefined;

    const progressFilter = progressIds !== undefined ?
        `&& railcontent_id in [${progressIds.join(',')}]` : "";

    const commonFilter = `_type == '${contentType}' && brand == "${brand}"${style ? ` && '${style}' in genre[]->name` : ''}${artist ? ` && artist->name == '${artist}'` : ''} ${progressFilter} ${includedFieldsFilter ? includedFieldsFilter : ''}`;
    const metaData = processMetadata(brand, contentType, true);
    const allowableFilters = (metaData) ? metaData['allowableFilters'] : [];

    let dynamicFilterOptions = '';
    allowableFilters.forEach(filter => {
        const filterOption = getFilterOptions(filter, commonFilter, contentType);
        dynamicFilterOptions += filterOption;
    });

    const query = `
        {
          "meta": {
            "totalResults": count(*[${commonFilter}
              ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}]),
            "filterOptions": {
              ${dynamicFilterOptions}
            }
        }
      }`;
  return fetchSanity(query, true);
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
      ${ getFieldsForContentType() }
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
  const query = buildQuery(
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
    const index = sortedChildren.indexOf(railcontentId);
    let nextId = sortedChildren[index + 1];
    let previousId = sortedChildren[index  -1];
    let nextPrev = await fetchByRailContentIds([nextId, previousId]);
    const nextLesson = nextPrev.find((elem) => {return elem['id'] === nextId});
    const prevLesson = nextPrev.find((elem) => {return elem['id'] === previousId});
    return {nextLesson, prevLesson};
}

/**
* Fetch all children of a specific method by Railcontent ID.
* @param {string} railcontentId - The Railcontent ID of the method.
* @returns {Promise<Array<Object>|null>} - The fetched children data or null if not found.
*/
export async function fetchMethodChildrenIds(railcontentId) {
    const query = `*[_type == 'learning-path' && railcontent_id == ${railcontentId}]{
    'children': child[]-> {
        'id': railcontent_id,
            'children': child[]-> {
            'id': railcontent_id,
                'children': child[]-> {
                'id': railcontent_id,
            }
        }
    }
}`;
    let allChildren = await fetchSanity(query, false);
    return getChildrenToDepth(allChildren, 4);
}

function getChildrenToDepth(parent, depth = 1)
{
    let allChildrenIds = [];
    if (parent['children']) {
        parent['children'].forEach((child) => {
            allChildrenIds.push(child['id']);
            allChildrenIds = allChildrenIds.concat(getChildrenToDepth(child, depth-1));
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
  //TODO: Implement getTypeNeighbouringSiblings/getNextAndPreviousLessons
  const query = `*[_railcontent_id == ${railcontentId}]{
        railcontent_id,
        title,
        "image": thumbnail.asset->url,
        "artist_name": artist->name,
        artist,
        difficulty,
        difficulty_string,
        web_url_path,
        published_on
      }`
  return fetchSanity(query, false);
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
    const filterParams = {};
    const fields = `title, 
          published_on,
          "type":_type, 
          "resources": resource, 
          difficulty, 
          difficulty_string, 
          brand, 
          soundslice, 
          instrumentless, 
          railcontent_id, 
          "id":railcontent_id, 
          slug, artist->,
          "thumbnail_url":thumbnail.asset->url, 
          "url": web_url_path, 
          soundslice_slug,
          description,
          "chapters": chapter[]{
            chapter_description,
            chapter_timecode,
            "chapter_thumbnail_url": chapter_thumbnail_url.asset->url
          },
          "coaches": instructor[]-> {
            name,
            "id":_id,
            "coach_profile_image":thumbnail_url.asset->url
          },
          "instructors":instructor[]->name,
          "instructor": instructor[]->{
            "id":_id,
            name,
            short_bio,
            web_url_path,
            "coach_card_image": coach_card_image.asset->url,
          },
          ${assignmentsField}
          video,
          length_in_seconds,
          mp3_no_drums_no_click_url,
          mp3_no_drums_yes_click_url,
          mp3_yes_drums_no_click_url,
          mp3_yes_drums_yes_click_url,`;
    const query = buildQuery(
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
  // let sort = 'published_on'
  // if (type == 'rhythmic-adventures-of-captain-carson' ||
  //     type == 'diy-drum-experiments' ||
  //     type == 'in-rhythm') {
  //     sort = 'sort';
  // }
  //TODO: Implement $this->contentService->getFiltered
  const query = `*[railcontent_id == ${railContentId} && brand == "${brand}" && references(*[_type=='permission']._id)]{
              "related_lessons" : array::unique([
                ...(*[_type=="song" && brand == "${brand}" && references(^.artist->_id)]{_id, "id":railcontent_id, published_on, title, "thumbnail_url":thumbnail.asset->url, difficulty_string, railcontent_id, artist->}[0...11]),
                ...(*[_type=="song" && brand == "${brand}" && references(^.genre[]->_id)]{_id, "id":railcontent_id, published_on, title, "thumbnail_url":thumbnail.asset->url, difficulty_string, railcontent_id, artist->}[0...11])
                ])|order(published_on, railcontent_id)[0...11]}`;
  return fetchSanity(query, false);
}

/**
* Fetch related method lessons for a specific lesson by RailContent ID and type.
* @param {string} railContentId - The RailContent ID of the current lesson.
* @param {string} brand - The current brand.
* @returns {Promise<Object>|null>} - The fetched related lessons
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
* @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
*/
export async function fetchAllPacks(brand, sort = "-published_on", searchTerm = "") {
  const sortOrder = getSortOrder(sort);
  const filter = `_type == 'pack' && brand == '${brand}' && title match "${searchTerm}*"`
  const filterParams = {};
  const fields = getFieldsForContentType('pack');
  const query = buildQuery(
    filter,
    filterParams,
    getFieldsForContentType('pack'),
    {
      logo_image_url: 'logo_image_url.asset->url',
      sortOrder: sortOrder,
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
    switch(brand) {
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
    "lessons": child[]->{
      "id": railcontent_id,
      title,
      "image": thumbnail.asset->url,
      "instructors": instructor[]->name,
      length_in_seconds,
      difficulty_string,
      difficulty,
      "type": _type,
    }
  } [0...1]`;
  return fetchSanity(query, false);
}

/**
 * Fetch the data needed for the coach screen.
 * @param {string} id - The Railcontent ID of the coach
 * @returns {Promise<Object|null>} - The lessons for the instructor or null if not found.
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
} = {}) {
  const fieldsString = getFieldsForContentType();
  const start = (page - 1) * limit;
  const end = start + limit;
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"`: ''
  const filter = `brand == '${brand}' ${searchFilter} && references(*[_type=='instructor' && railcontent_id == ${id}]._id)`;
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
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"`: '';
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
 * @returns {Promise<Object|null>} - The lessons for the artist and some details about the artist (name and thumbnail).
 *
 * @example
 * fetchArtistLessons('10 Years', 'song')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistLessons(brand, name, contentType, {
  sort = '-published_on',
  searchTerm = '',
  page = 1,
  limit = 10,
  includedFields = [],
} = {}) {
  const fieldsString = DEFAULT_FIELDS.join(',');
  const start = (page - 1) * limit;
  const end = start + limit;
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"`: ''  
  const sortOrder = getSortOrder(sort);
  const addType = contentType && Array.isArray(contentType) ? `_type in ['${contentType.join("', '")}'] &&` : contentType ? `_type == '${contentType}' && `:''
  const includedFieldsFilter = includedFields.length > 0
  ? filtersToGroq(includedFields)
  : "";

  const query = `{
    "entity": 
      *[_type == 'artist' && name == '${name}']
        {'type': _type, name, 'thumbnail_url':thumbnail_url.asset->url, 
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]), 
        'lessons': *[${addType} brand == '${brand}' && references(^._id) ${searchFilter} ${includedFieldsFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`;
  return fetchSanity(query, true);
}

/**
 * Fetch the genre's lessons.
 * @param {string} brand - The brand for which to fetch lessons.
 * @param {string} name - The name of the genre
 * @param {string} contentType - The type of the lessons we need to get from the genre. If not defined, groq will get lessons from all content types
 * @returns {Promise<Object|null>} - The lessons for the genre and some details about the genre (name and thumbnail).
 *
 * @example
 * fetchGenreLessons('Blues', 'song')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(brand, name, contentType, {
  sort = '-published_on',
  searchTerm = '',
  page = 1,
  limit = 10,
  includedFields = [],
} = {}) {
  const fieldsString = DEFAULT_FIELDS.join(',');
  const start = (page - 1) * limit;
  const end = start + limit;
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"`: ''  
  const sortOrder = getSortOrder(sort);
  const addType = contentType ? `_type == '${contentType}' && `:''
  const includedFieldsFilter = includedFields.length > 0
  ? filtersToGroq(includedFields)
  : "";

  const query = `{
    "entity": 
      *[_type == 'genre' && name == '${name}']
        {'type': _type, name, 'thumbnail_url':thumbnail_url.asset->url, 
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]), 
        'lessons': *[${addType} brand == '${brand}' && references(^._id) ${searchFilter} ${includedFieldsFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`;
  return fetchSanity(query, true);
}



/**
 * Fetch data from the Sanity API based on a provided query.
 *
 * @param {string} query - The GROQ query to execute against the Sanity API.
 * @param {boolean} isList - Whether to return an array or a single result.
 * @returns {Promise<Object|null>} - A promise that resolves to the fetched data or null if an error occurs or no results are found.
 *
 * @example
 * const query = `*[_type == "song"]{title, artist->name}`;
 * fetchSanity(query, true)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchSanity(query, isList) {
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
      const response = await fetch(url, {headers});
      if (!response.ok) {
          throw new Error(`Sanity API error: ${response.status} - ${response.statusText}`);
      }
      const result = await response.json();
      if (result.result) {
          if (globalConfig.sanityConfig.debug) {
              console.log("fetchSanity Results:", result);
          }
          return isList ? result.result : result.result[0];
      } else {
          throw new Error('No results found');
      }
  } catch (error) {
      console.error('fetchSanity: Fetch error:', error);
      return null;
  }
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
export async function fetchCatalogMetadata(contentType)
{   const query = `*[_type == 'CatalogMetadata']{
        catalog_type,
        brand,
        groq_results,
        groq_search_fields,
        meta_data_groq,
        modal_text,
        sort_by,
      }`
    return fetchSanity(query, false);
}

/**
 * Fetch shows data for a brand.
 *
 * @param brand - The brand for which to fetch shows.
 * @returns {Promise<[]>}
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
 * Fetch metadata from the contentTypeConfig.js based on brand and type.
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


function     buildRawQuery(
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


function     buildQuery(
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
    const filter = new FilterBuilder(baseFilter, filterParams).buildFilter();
    return buildRawQuery(filter, fields, {sortOrder, start, end, isSingle});
}

function     buildEntityAndTotalQuery(
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
function processMetadata(brand, type, withFilters = false) {
    const metadataElement = contentMetadata[brand]?.[type];
    if (!metadataElement) {
        return null;
    }
    const processedData = {
        type,
        thumbnailUrl: metadataElement.thumbnailUrl || null,
        name: metadataElement.name || null,
        description: metadataElement.description || null
    };

    if (withFilters) {
        Object.keys(metadataElement).forEach(key => {
            if ( !['thumbnailUrl', 'name', 'description'].includes(key) ) {
                processedData[key] = metadataElement[key];
            }
        });
    }

    return processedData;
}

function getFilterOptions(option, commonFilter,contentType){
    let filterGroq = '';
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
        case "genre":
        case "essential":
        case "focus":
        case "theory":
        case "topic":
        case "lifestyle":
        case "creativity":
            filterGroq = `
            "${option}": *[_type == '${option}' && '${contentType}' in filter_types] {
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





