/**
 * @module Sanity-Services
 */
import {contentTypeConfig} from "../contentTypeConfig";
import {globalConfig} from "./config";

import { fetchAllCompletedStates, fetchCurrentSongComplete } from './railcontent.js';

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
    const fields = [
      '"id": railcontent_id',
      'railcontent_id',
      '"type": _type',
      'description',
      'title',
      '"thumbnail_url": thumbnail.asset->url',
      '"style": genre[0]->name',
      '"artist": artist->name',
      'album',
      'instrumentless',
      'soundslice',
      '"resources": resource[]{resource_url, resource_name}',
      '"url": web_url_path',
    ];

    const query = `
        *[_type == "song" && railcontent_id == ${documentId}]{
            ${fields.join(', ')}
        }`;

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
  const query = `
  *[_type == "artist"]{
    name,
    "lessonsCount": count(*[_type == "song" && brand == "${brand}" && references(^._id)])
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
  }
`;

  return fetchSanity(query, true);
}

/**
* Fetch the total count of songs for a specific brand.
* @param {string} brand - The brand for which to fetch the song count.
* @returns {Promise<number|null>} - The total count of songs or null if an error occurs.
*/
export async function fetchSongCount(brand) {
  const query = `count(*[_type == 'song' && brand == "${brand}"])`;
  return fetchSanity(query, false);
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
  const query = `*[_type == 'workout' && brand == '${brand}'] [0...5] {
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
      } | order(published_on desc)[0...5]`
  return fetchSanity(query, true);
}

/**
* Fetch the latest new releases for a specific brand.
* @param {string} brand - The brand for which to fetch new releases.
* @returns {Promise<Object|null>} - The fetched new releases data or null if not found.
*/
export async function fetchNewReleases(brand) {
  const newTypes = {
      'drumeo': ["drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "question-and-answer", "student-collaborations", "live-streams", "live", "podcasts", "solos", "boot-camps", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
      'pianote': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
      'guitareo': ["student-review", "student-reviews", "question-and-answer", "archives", "recording", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
      'singeo': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
      'default': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"]
  };
  const typesString = arrayJoinWithQuotes(newTypes[brand] ?? newTypes['default']);
  const query = `*[_type in [${typesString}] && brand == '${brand}'] | order(releaseDate desc) [0...5] {
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
      } | order(published_on desc)[0...5]`
  return fetchSanity(query, true);
}


/**
* Fetch upcoming events for a specific brand.
*
* @param {string} brand - The brand for which to fetch upcoming events.
* @returns {Promise<Object|null>} - A promise that resolves to an array of upcoming event objects or null if not found.
*
* @example
* fetchUpcomingEvents('drumeo')
*   .then(events => console.log(events))
*   .catch(error => console.error(error));
*/
export async function fetchUpcomingEvents(brand) {
  const baseLiveTypes = ["student-review", "student-reviews", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"];
  const liveTypes = {
      'drumeo': [...baseLiveTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "student-collaborations", "live-streams", "podcasts", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums"],
      'pianote': baseLiveTypes,
      'guitareo': [...baseLiveTypes, "archives"],
      'singeo': baseLiveTypes,
      'default': baseLiveTypes
  };
  const typesString = arrayJoinWithQuotes(liveTypes[brand] ?? liveTypes['default']);
  const now = getSanityDate(new Date());
  //TODO: status = 'scheduled'  is this handled in sanity?
  const query = `*[_type in [${typesString}] && brand == '${brand}' && published_on > '${now}']{
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
      } | order(published_on asc)[0...5]`;
  return fetchSanity(query, true);
}

/**
* Fetch content by a specific Railcontent ID.
*
* @param {string} id - The Railcontent ID of the content to fetch.
* @returns {Promise<Object|null>} - A promise that resolves to the content object or null if not found.
*
* @example
* fetchByRailContentId('abc123')
*   .then(content => console.log(content))
*   .catch(error => console.error(error));
*/
export async function fetchByRailContentId(id) {
  const query = `*[railcontent_id == ${id}]{
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
* Fetch content by an array of Railcontent IDs.
*
* @param {Array<string>} ids - The array of Railcontent IDs of the content to fetch.
* @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of content objects or null if not found.
*
* @example
* fetchByRailContentIds(['abc123', 'def456', 'ghi789'])
*   .then(contents => console.log(contents))
*   .catch(error => console.error(error));
*/
export async function fetchByRailContentIds(ids) {
  const idsString = ids.join(',');
  const query = `*[railcontent_id in [${idsString}]]{
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
 * @returns {Promise<Object|null>} - The fetched content data or null if not found.
 *
 * @example
 * fetchAll('drumeo', 'song', {
 *   page: 2,
 *   limit: 20,
 *   searchTerm: 'jazz',
 *   sort: '-popularity',
 *   includedFields: ['difficulty,Intermediate'],
 *   groupBy: 'artist'
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
  groupBy = ""
} = {}) {
    let config = contentTypeConfig[type] ?? {};
    let additionalFields = config?.fields ?? [];
    let isGroupByOneToOne = (groupBy ? config?.relationships?.[groupBy]?.isOneToOne : false) ?? false;
    const start = (page - 1) * limit;
    const end = start + limit;

    // Construct the search filter
    const searchFilter = searchTerm
        ? `&& (artist->name match "${searchTerm}*" || title match "${searchTerm}*")`
        : "";

    // Construct the included fields filter, replacing 'difficulty' with 'difficulty_string'
    const includedFieldsFilter = includedFields.length > 0
        ? includedFields.map(field => {
            let [key, value] = field.split(',');
            if (key === 'difficulty') {
                key = 'difficulty_string';
            }
            return `&& ${key} == "${value}"`;
        }).join(' ')
        : "";

    // Determine the sort order
    let sortOrder;
    switch (sort) {
        case "slug":
            if(groupBy){
              sortOrder = "name asc";
            } else {
              sortOrder = "title asc";
            }

            break;
        case "published_on":
            sortOrder = "published_on asc";
            break;
        case "-published_on":
            sortOrder = "published_on desc";
            break;
        case "-slug":
            if(groupBy){
              sortOrder = "name desc";
            } else {
              sortOrder = "title desc";
            }

            break;
        case "-popularity":
            sortOrder = "popularity desc";
            break;
        default:
            sortOrder = "published_on asc";
            break;
    }

    let defaultFields = [
        '"id": railcontent_id',
        'railcontent_id',
        '"type": _type',
        'title',
        '"image": thumbnail.asset->url',
        'difficulty',
        'difficulty_string',
        'web_url_path',
        'published_on'];

    let fields = defaultFields.concat(additionalFields);
    let fieldsString = fields.join(',');

    // Determine the group by clause
    let query = "";
    if (groupBy !== "" && isGroupByOneToOne) {
        query = `
        {
            "total": count(*[_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ]._id) > 0]),
            "entity": *[_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ]._id) > 0]
            {
                'id': _id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'all_lessons_count': count(*[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ]._id),
                'lessons': *[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ]{
                    ${fieldsString},
                    ${groupBy}
                }[0...10]
            }
            |order(${sortOrder})
            [${start}...${end}]
        }`;
    } else if (groupBy !== "") {
        query = `
        {
            "total": count(*[_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref]._id)>0]),
            "entity": *[_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref]._id) > 0]
            {
                'id': _id,
                'type': _type,
                name,
                'head_shot_picture_url': thumbnail_url.asset->url,
                'all_lessons_count': count(*[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref ]._id),
                'lessons': *[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref ]{
                    ${fieldsString},
                    ${groupBy}
                }[0...10]
            }
            |order(${sortOrder})
            [${start}...${end}]
        }`;
    } else {
        query = `
        {
            "entity": *[_type == '${type}' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}] | order(${sortOrder}) [${start}...${end}] {
                ${fieldsString}
            },
            "total": count(*[_type == '${type}' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}])
        }
    `;
    }

    return fetchSanity(query, true);
}

/**
* Fetches all available filter options based on various criteria such as brand, filters, style, artist, content type, and search term.
*
* This function constructs a query to retrieve the total number of results and filter options such as difficulty, instrument type, and genre.
* The filter options are dynamically generated based on the provided filters, style, artist, and content type.
*
* @param {string} brand - The brand for which to fetch the filter options.
* @param {string} filters - Additional filters to apply to the query, typically in the format of Sanity GROQ queries.
* @param {string} [style] - Optional style or genre to filter the results. If provided, the query will check if the style exists in the genre array.
* @param {string} [artist] - Optional artist name to filter the results. If provided, the query will check if the artist's name matches.
* @param {string} contentType - The content type to fetch (e.g., 'song', 'lesson').
* @param {string} [term] - Optional search term to match against various fields such as title, album, artist name, and genre.
*
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
    term
) {
    const commonFilter = `_type == '${contentType}' && brand == "${brand}"${style ? ` && '${style}' in genre[]->name` : ''}${artist ? ` && artist->name == '${artist}'` : ''} ${filters ? filters : ''}`;
    const query = `
        {  
          "meta": {
            "totalResults": count(*[${commonFilter}
              ${term ? ` && (title match "${term}" || album match "${term}" || artist->name match "${term}" || genre[]->name match "${term}")` : ''}]),
            "filterOptions": {
              "difficulty": [
                  {"type": "Introductory", "count": count(*[${commonFilter} && difficulty_string == "Introductory"])},
                  {"type": "Beginner", "count": count(*[${commonFilter} && difficulty_string == "Beginner"])},
                  {"type": "Intermediate", "count": count(*[${commonFilter} && difficulty_string == "Intermediate" ])},
                  {"type": "Advanced", "count": count(*[${commonFilter} && difficulty_string == "Advanced" ])},
                  {"type": "Expert", "count": count(*[${commonFilter} && difficulty_string == "Expert" ])}
              ][count > 0],
              "instrumentless": [
                  {"type": "Full Song Only", "count": count(*[${commonFilter} && instrumentless == false ])},
                  {"type": "Instrument Removed", "count": count(*[${commonFilter} && instrumentless == true ])}
              ][count > 0],
              "genre": *[_type == 'genre' && '${contentType}' in filter_types] {
                "type": name,
                "count": count(*[${commonFilter} && references(^._id)])
              }[count > 0]
            }
        }
      }
    }`;
  return fetchSanity(query, true);
}

/**
* Fetch children content by Railcontent ID.
* @param {string} railcontentId - The Railcontent ID of the parent content.
* @returns {Promise<Array<Object>|null>} - The fetched children content data or null if not found.
*/
export async function fetchChildren(railcontentId) {
  //TODO: Implement getByParentId include sum XP
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
      } | order(published_on asc)`
  return fetchSanity(query, true);
}

/**
* Fetch the Methods (learning-paths) for a specific brand.
* @param {string} brand - The brand for which to fetch methods.
* @returns {Promise<Object|null>} - The fetched methods data or null if not found.
*/
export async function fetchMethods(brand) {
    const query = `*[_type == 'learning-path' && brand == "drumeo"] {
      child_count,
      difficulty,
      "description": description[0].children[0].text,
      hide_from_recsys,
      "instructors":instructor[]->name,
      length_in_seconds,
      permission,
      popularity,
      published_on,
      railcontent_id,
      "slug": slug.current,
      status,
      "thumbnail": thumbnail.asset->url,
      "thumbnail_logo": logo_image_url.asset->url
      title,
      total_xp,
      "type": _type,
      web_url_path,
      xp
    } | order(published_on asc)`
  return fetchSanity(query, true);
}

/**
* Fetch the next lesson for a specific method by Railcontent ID.
* @param {string} railcontentId - The Railcontent ID of the current lesson.
* @returns {Promise<Object|null>} - The fetched next lesson data or null if not found.
*/
export async function fetchMethodNextLesson(railcontentId) {
  //TODO: Implement getNextContentForParentContentForUser
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
* Fetch all children of a specific method by Railcontent ID.
* @param {string} railcontentId - The Railcontent ID of the method.
* @returns {Promise<Array<Object>|null>} - The fetched children data or null if not found.
*/
export async function fetchMethodChildren(railcontentId) {
  //TODO: Implement getByParentId include sum XP
  return fetchChildren(railcontentId);
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
  const query = `*[railcontent_id == ${railContentId} ]
          {title, published_on,"type":_type, "resources": resource, difficulty, difficulty_string, brand, soundslice, instrumentless, railcontent_id, "id":railcontent_id, slug, artist->,"thumbnail_url":thumbnail.asset->url, "url": web_url_path, soundslice_slug,description,
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
          instructor[]->,
          "assignments":assignment[]{
            "id": railcontent_id,
            "soundslice_slug": assignment_soundslice,
            "title": assignment_title,
            "sheet_music_image_url": assignment_sheet_music_image,
            "timecode": assignment_timecode,
            "description": assignment_description
          },
         video}`
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
* Fetch all content for a specific pack by Railcontent ID.
* @param {string} railcontentId - The Railcontent ID of the pack.
* @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
*/
export async function fetchPackAll(railcontentId) {
  //TODO: Implement getPacks
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
      } | order(published_on asc)[0...5]`
  return fetchSanity(query, true);
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
  return fetchChildren(railcontentId, 'pack');
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
  // WIP
  const query = `*[railcontent_id == ${id}]{
        "id": railcontent_id,
        railcontent_id,
        title,
        "image": thumbnail.asset->url,
        "instructors": instructor[]->name,
        difficulty,
        difficulty_string,
        web_url_path,
        published_on,
        "type": _type,
        total_xp,
        xp,
        description,
        resource,
        "lessons": child[]->{
          "id": railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "instructors": instructor[]->name,
          length_in_seconds,
        }
      }`
  return fetchSanity(query, false);
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


//Helper Functions
function arrayJoinWithQuotes(array, delimiter = ',') {
  const wrapped = array.map(value => `'${value}'`);
  return wrapped.join(delimiter)
}

function getSanityDate(date) {
  return date.toISOString();
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
