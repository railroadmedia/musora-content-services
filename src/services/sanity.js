/**
 * @module Sanity-Services
 */
import { getSanityFieldsToGrab } from "../definitions/sanityFieldDefinitions";
import { createClient } from '@sanity/client';
import {q, makeSafeQueryRunner, nullToUndefined, sanityImage} from "groqd";
import { globalConfig } from "./config";
import {FilterBuilder} from "../filterBuilder";

let sanityClient = null;
let runSanityQuery = null;

// Empty array will enable queries to return content with any or no permissions.
// The content only has to have one of the required permissions
let requiredContentPermissions = [];
let includedContentStatuses = []; // empty array will enable queries to return content with any or no status

/**
 * Initialize the Sanity client and query runner.
 */
function initializeSanityClient() {
    if (!sanityClient) {
        sanityClient = createClient(globalConfig.sanityConfig);
        runSanityQuery = makeSafeQueryRunner((query) => sanityClient.fetch(query));
    }
}

/**
 * Fetch a song by its document ID from Sanity.
 * @param {string|number} documentId - The ID of the document to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to the song data or null if not found.
 */
export async function fetchSongById(documentId) {
    initializeSanityClient();

    let contentType = 'song';
    const filter = new FilterBuilder(`_type == "${contentType}" && railcontent_id == ${documentId}`).buildFilter();
    console.log(filter);
    const query = q('*')
        .filter(filter)
        .grab(getSanityFieldsToGrab(contentType))
        .slice(0, 1);

    let results = await runSanityQuery(query);

    return results[0] || undefined;
}

/**
 * Fetch all artists with lessons available for a specific brand.
 * @param {string} brand - The brand for which to fetch artists.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of artist objects or null if not found.
 */
export async function fetchArtists(brand) {
    initializeSanityClient();

    const query = q('*')
        .filterByType('artist')
        .grab({
            name: q.string(),
            lessonsCount: [`count(*[_type == "song" && brand == '${brand}' && references(^._id)])`, q.number()]
        })
        .filter('lessonsCount > 0');

    return await runSanityQuery(query);
}

/**
 * Fetch current number of artists for songs within a brand.
 * @param {string} brand - The current brand.
 * @returns {Promise<number|null>} - The fetched count of artists.
 */
export async function fetchSongArtistCount(brand) {
    initializeSanityClient();

    const subQuery = q('*')
        .filterByType('artist')
        .grab({
            name: q.string(),
            lessonsCount: [`count(*[_type == "song" && brand == '${brand}' && references(^._id)])`, q.number()]
        })
        .filter('lessonsCount > 0');

    const query = q(`count(${subQuery.query})`);

    return await runSanityQuery(query);
}

/**
 * Fetch related songs for a specific brand and song ID.
 *
 * @param {string} brand - The brand for which to fetch related songs.
 * @param songArtist
 * @param songGenre
 * @returns {Promise<Object|null>} - A promise that resolves to an array of related song objects or null if not found.
 *
 * @example
 * fetchRelatedSongs('drumeo', '12345')
 *   .then(relatedSongs => console.log(relatedSongs))
 *   .catch(error => console.error(error));
 */
export async function fetchRelatedSongs(brand, songArtist, songGenre) {
    initializeSanityClient();
    const filter = new FilterBuilder(`_type == 'song' && brand == "${brand}" && (artist->name == "${songArtist}" || (count((genre[]->name)[@ in ["${songGenre}"]]) > 0))`).buildFilter();
    const query = q('*')
        .filter(filter)
        .order('published_on desc')
        .grab(getSanityFieldsToGrab('song'))
        .slice(0, 9);

    return await runSanityQuery(query)
}

/**
 * Fetch all songs for a specific brand with pagination and search options.
 * @param {string} brand - The brand for which to fetch songs.
 * @param {Object} options - Options for pagination, filtering, and sorting.
 * @returns {Promise<Object|null>} - The fetched song data or null if not found.
 */
export async function fetchAllSongs(brand, options) {
    return fetchAll(brand, 'song', options);
}

/**
 * Fetch filter options for a specific brand.
 * @param {string} brand - The brand for which to fetch filter options.
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing filter options or null if not found.
 */
export async function fetchSongFilterOptions(brand) {
    initializeSanityClient();
    const query = q.object({
        difficulty: q('*')
            .filterByType('song')
            .filter(`brand == '${brand}'`)
            .grab({ difficulty_string: q.string() })
            .groupBy('difficulty_string')
            .grab({
                type: q.select('difficulty_string'),
                count: q.number()
            }),
        genre: q('*')
            .filterByType('genre')
            .filter(`'song' in filter_types`)
            .grab({
                type: q.string(),
                count: q.number()
            })
            .project({
                count: q('count').filter(`_type == 'song' && brand == '${brand}' && references(^._id)`)
            }),
        instrumentless: q('*')
            .filterByType('song')
            .filter(`brand == '${brand}'`)
            .grab({ instrumentless: q.boolean() })
            .groupBy('instrumentless')
            .grab({
                type: q.select(`instrumentless ? "Instrument Removed" : "Full Song Only"`),
                count: q.number()
            })
    });

    return runSanityQuery(query);
}

/**
 * Fetch the total count of songs for a specific brand.
 * @param {string} brand - The brand for which to fetch the song count.
 * @returns {Promise<number|null>} - The total count of songs or null if an error occurs.
 */
export async function fetchSongCount(brand) {
    initializeSanityClient();
    const query = q('count').filter(`_type == 'song' && brand == "${brand}"`);
    return runSanityQuery(query);
}

/**
 * Fetch the latest workouts for a specific brand.
 * @param {string} brand - The brand for which to fetch workouts.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of workout data objects or null if no workouts are found.
 */
export async function fetchWorkouts(brand) {
    initializeSanityClient();
    const fields = getFieldsForContentType('workout');
    const query = q('*')
        .filterByType('workout')
        .filter(`brand == '${brand}'`)
        .grab(fields)
        .slice(0, 5)
        .order('published_on desc');

    return runSanityQuery(query);
}

/**
 * Fetch the latest new releases for a specific brand.
 * @param {string} brand - The brand for which to fetch new releases.
 * @returns {Promise<Array<Object>|null>} - The fetched new releases data or null if not found.
 */
export async function fetchNewReleases(brand) {
    initializeSanityClient();
    const newTypes = {
        'drumeo': ["drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "question-and-answer", "student-collaborations", "live-streams", "live", "podcasts", "solos", "boot-camps", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'pianote': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'guitareo': ["student-review", "student-reviews", "question-and-answer", "archives", "recording", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'singeo': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'default': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"]
    };

    const typesArray = newTypes[brand] ?? newTypes['default'];

    const query = q('*')
        .filter(new FilterBulder(`_type in $types && brand == '${brand}'`))
        .grab({
            id: q.alias('railcontent_id', q.string()),
            title: q.string(),
            image: q.string(),
            artist_name: q.string(),
            artists: q.array(q.string()),
            difficulty: q.string(),
            difficulty_string: q.string(),
            length_in_seconds: q.number(),
            published_on: q.string(),
            type: q.alias('_type', q.string()),
            web_url_path: q.string(),
        })
        .slice(0, 5)
        .order('published_on desc')
        .params({ types: typesArray });

    return runSanityQuery(query);
}

/**
 * Fetch upcoming events for a specific brand.
 * @param {string} brand - The brand for which to fetch upcoming events.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of upcoming event objects or null if not found.
 */
export async function fetchUpcomingEvents(brand) {
    initializeSanityClient();
    const baseLiveTypes = ["student-review", "student-reviews", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"];
    const liveTypes = {
        'drumeo': [...baseLiveTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "student-collaborations", "live-streams", "podcasts", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums"],
        'pianote': baseLiveTypes,
        'guitareo': [...baseLiveTypes, "archives"],
        'singeo': baseLiveTypes,
        'default': baseLiveTypes
    };

    const typesArray = liveTypes[brand] ?? liveTypes['default'];
    const now = new Date().toISOString();

    const query = q('*')
        .filter(`_type in $types && brand == '${brand}' && published_on > '${now}' && status == 'scheduled'`)
        .grab({
            id: q.alias('railcontent_id', q.string()),
            title: q.string(),
            image: q.string(),
            artist_name: q.string(),
            artists: q.array(q.string()),
            difficulty: q.string(),
            difficulty_string: q.string(),
            length_in_seconds: q.number(),
            published_on: q.string(),
            type: q.alias('_type', q.string()),
            web_url_path: q.string(),
        })
        .slice(0, 5)
        .order('published_on asc')
        .params({ types: typesArray });

    return runSanityQuery(query);
}

/**
 * Fetch content by a specific Railcontent ID.
 * @param {string} id - The Railcontent ID of the content to fetch.
 * @param {string} [contentType] - The content type to add needed fields to the response.
 * @returns {Promise<Object|null>} - A promise that resolves to the content object or null if not found.
 */
export async function fetchByRailContentId(id, contentType) {
    initializeSanityClient();
    const query = q('*')
        .filter(`railcontent_id == ${id}`)
        .grab(getFieldsForContentType(contentType));

    return runSanityQuery(query);
}

/**
 * Fetch content by an array of Railcontent IDs.
 * @param {Array<string>} ids - The array of Railcontent IDs of the content to fetch.
 * @param {string} [contentType] - The content type to add needed fields to the response.
 * @returns {Promise<Array<Object>|null>} - A promise that resolves to an array of content objects or null if not found.
 */
export async function fetchByRailContentIds(ids, contentType) {
    initializeSanityClient();
    const query = q('*')
        .filter(`railcontent_id in $ids`)
        .grab(getFieldsForContentType(contentType))
        .params({ ids });

    return runSanityQuery(query);
}

/**
 * Fetch all content for a specific brand and type with pagination, search, and grouping options.
 * @param {string} brand - The brand for which to fetch content.
 * @param {string} type - The content type to fetch (e.g., 'song', 'artist').
 * @param {Object} options - Options for pagination, filtering, sorting, and grouping.
 * @returns {Promise<Object|null>} - The fetched content data or null if not found.
 */
export async function fetchAll(brand, type, options = {}) {
    initializeSanityClient();
    const {
        page = 1,
        limit = 10,
        searchTerm = "",
        sort = "-published_on",
        includedFields = [],
        groupBy = ""
    } = options;

    //const config = contentTypeConfig[type] ?? {};
    const additionalFields = config?.fields ?? [];
    const isGroupByOneToOne = groupBy ? config?.relationships?.[groupBy]?.isOneToOne ?? false : false;

    const start = (page - 1) * limit;
    const end = start + limit;

    const searchFilter = searchTerm
        ? groupBy
            ? `&& (^.name match "${searchTerm}*" || title match "${searchTerm}*")`
            : `&& (artist->name match "${searchTerm}*" || instructor[]->name match "${searchTerm}*" || title match "${searchTerm}*")`
        : "";

    const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : "";

    const sortOrder = getSortOrder(sort, groupBy);

    const fields = [...DEFAULT_FIELDS, ...additionalFields];

    let query;
    if (groupBy && isGroupByOneToOne) {
        query = buildGroupByOneToOneQuery(brand, type, groupBy, searchFilter, includedFieldsFilter, sortOrder, start, end, fields);
    } else if (groupBy) {
        query = buildGroupByManyToManyQuery(brand, type, groupBy, searchFilter, includedFieldsFilter, sortOrder, start, end, fields);
    } else {
        query = buildDefaultQuery(brand, type, searchFilter, includedFieldsFilter, sortOrder, start, end, fields);
    }

    return runSanityQuery(query);
}

// Helper functions

function buildGroupByOneToOneQuery(brand, type, groupBy, searchFilter, includedFieldsFilter, sortOrder, start, end, fields) {
    return q.object({
        total: q('count').filter(`_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter}]._id) > 0`),
        entity: q('*')
            .filter(`_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter}]._id) > 0`)
            .grab({
                id: q.string(),
                type: q.string(),
                name: q.string(),
                head_shot_picture_url: q.string(),
                all_lessons_count: q.number(),
                lessons: q('*')
                    .filter(`_type == '${type}' && brand == '${brand}' && ^._id == ${groupBy}._ref ${searchFilter} ${includedFieldsFilter}`)
                    .grab({ ...fields, [groupBy]: q.string() })
                    .slice(0, 10)
            })
            .order(sortOrder)
            .slice(start, end)
    });
}

function buildGroupByManyToManyQuery(brand, type, groupBy, searchFilter, includedFieldsFilter, sortOrder, start, end, fields) {
    return q.object({
        total: q('count').filter(`_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref ${searchFilter} ${includedFieldsFilter}]._id) > 0`),
        entity: q('*')
            .filter(`_type == '${groupBy}' && count(*[_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref ${searchFilter} ${includedFieldsFilter}]._id) > 0`)
            .grab({
                id: q.string(),
                type: q.string(),
                name: q.string(),
                head_shot_picture_url: q.string(),
                all_lessons_count: q.number(),
                lessons: q('*')
                    .filter(`_type == '${type}' && brand == '${brand}' && ^._id in ${groupBy}[]._ref ${searchFilter} ${includedFieldsFilter}`)
                    .grab({ ...fields, [groupBy]: q.string() })
                    .slice(0, 10)
            })
            .order(sortOrder)
            .slice(start, end)
    });
}

function buildDefaultQuery(brand, type, searchFilter, includedFieldsFilter, sortOrder, start, end, fields) {
    const filter = new FilterBuilder(`_type == '${type}' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}`).buildFilter();
    console.log(filter);
    return q.object({
        entity: q('*')
            .filter(filter)
            .grab(fields)
            .order(sortOrder)
            .slice(start, end),
        total: q('count').filter(`_type == '${type}' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}`)
    });
}

function getSortOrder(sort = '-published_on', groupBy) {
    const isDesc = sort.startsWith('-');
    const field = isDesc ? sort.substring(1) : sort;
    const order = isDesc ? 'desc' : 'asc';

    switch (field) {
        case "slug":
            return `${groupBy ? 'name' : "title"} ${order}`;
        case "popularity":
            return `popularity ${order}`;
        case "published_on":
        default:
            return `published_on ${order}`;
    }
}

export function getFilterString(query, restrictByContentPermissions = true, restrictByContentStatuses = true) {
    if (restrictByContentPermissions) {
        query += getCurrentRequiredContentPermissionsQueryString(true);
    }

    if (restrictByContentStatuses) {
        query += getCurrentRequiredContentPermissionsQueryString(true);
    }
}

export function getCurrentRequiredContentPermissionsQueryString(
    requiredPermissionIdOverride = null,
    withPrependedAmpersands = true
) {
    let queryString = (withPrependedAmpersands ? ' && ' : '') + 'references(*[_type == "permission" && _id in ';
    let permissionsToFilterBy = requiredPermissionIdOverride ? requiredPermissionIdOverride : requiredContentPermissions;

    queryString += arrayToStringRepresentation(permissionsToFilterBy);
    queryString += ']._id)';

    return queryString;
}


export function getCurrentIncludedContentStatusesQueryString(
    includedStatusesOverrideOverride = null,
    withPrependedAmpersands = true
) {
    let queryString = (withPrependedAmpersands ? ' && ' : '') + 'status in ';
    let permissionsToFilterBy = requiredPermissionIdOverride ? requiredPermissionIdOverride : requiredContentPermissions;

    queryString += arrayToStringRepresentation(permissionsToFilterBy);

    return queryString;
}

function arrayToStringRepresentation(arr) {
    return '[' + arr.map(item => `"${item}"`).join(',') + ']';
}