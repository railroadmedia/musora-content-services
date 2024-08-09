

/**
 * Fetch a song by its document ID from Sanity.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} documentId - The ID of the document to fetch.
 * @returns {Promise<Object|null>} - The fetched song data or null if not found.
 */
export async function fetchSongById(config, documentId) {
    const fields = [
        'title',
        '"thumbnail_url": thumbnail.asset->url',
        '"style": genre[0]->name',
        '"artist": artist->name',
        'album',
        'instrumentless',
        'soundslice',
        '"resources": resource[]{resource_url, resource_name}',
    ];

    const query = `
    *[_type == "song" && railcontent_id == ${documentId}]{
      ${fields.join(', ')}
    }`;
    return fetchSanity(config, query);
}

/**
 * Fetch all artists with lessons available for a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch artists.
 * @returns {Promise<Object|null>} - The fetched artist data or null if not found.
 */
export async function fetchArtists(config, brand) {
    const query = `
    *[_type == "artist"]{
      name,
      "lessonsCount": count(*[_type == "song" && brand == "${brand}" && references(^._id)])
    }[lessonsCount > 0]`;
    return fetchSanity(config, query);
}

/**
 * Fetch related songs for a specific brand and song ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch related songs.
 * @param {string} songId - The ID of the song to find related songs for.
 * @returns {Promise<Object|null>} - The fetched related songs data or null if not found.
 */
export async function fetchRelatedSongs(config, brand, songId) {
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

    return fetchSanity(config, query);
}

/**
 * Fetch all songs for a specific brand with pagination and search options.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch songs.
 * @param {Object} params - Parameters for pagination, filtering, and sorting.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of songs per page.
 * @param {string} [params.searchTerm=""] - The search term to filter songs by title or artist.
 * @param {string} [params.sort="-published_on"] - The field to sort the songs by.
 * @param {Array<string>} [params.includedFields=[]] - The fields to include in the query.
 * @param {string} [params.groupBy=""] - The field to group the results by.
 * @returns {Promise<Object|null>} - The fetched song data or null if not found.
 */
export async function fetchAllSongs(config, brand, { page = 1, limit = 10, searchTerm = "", sort = "-published_on", includedFields = [] , groupBy = "" }) {
    console.log('groupBy', groupBy)
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
            sortOrder = "artist->name asc";
            break;
        case "published_on":
            sortOrder = "published_on desc";
            break;
        case "-published_on":
            sortOrder = "published_on asc";
            break;
        case "-slug":
            sortOrder = "artist->name desc";
            break;
        case "-popularity":
            sortOrder = "popularity desc";
            break;
        default:
            sortOrder = "published_on asc";
            break;
    }

    // Determine the group by clause
    let query = "";
    if (groupBy === "artist") {
        query = `
      {
        "total": count(*[_type == 'artist' && count(*[_type == 'song' && brand == '${brand}' && ^._id == artist._ref ]._id) > 0]),
        "entity": *[_type == 'artist' && count(*[_type == 'song' && brand == '${brand}' && ^._id == artist._ref ]._id) > 0]
          {
            'id': _id,
            'type': _type,
            name,
            'head_shot_picture_url': thumbnail_url.asset->url,
            'all_lessons_count': count(*[_type == 'song' && brand == '${brand}' && ^._id == artist._ref ]._id),
            'lessons': *[_type == 'song' && brand == '${brand}' && ^._id == artist._ref ]{
              railcontent_id,
              title,
              "image": thumbnail.asset->url,
              "artist_name": artist->name,
              artist,
              difficulty,
              difficulty_string,
              web_url_path,
              published_on
            }[0...10]
          }
        |order(${sortOrder})
        [${start}...${end}]
      }`;
    } else if (groupBy === "genre") {
        query = `
      {
        "total": count(*[_type == 'genre'  && count(*[_type == 'song' && brand == '${brand}' && ^._id in genre[]._ref ]._id) > 0]),
        "entity":
          *[_type == 'genre'  && count(*[_type == 'song' && brand == '${brand}' && ^._id in genre[]._ref ]._id)>0]
          {
            'id': _id,
            'type': _type,
            name,
            'head_shot_picture_url': thumbnail_url.asset->url,
            'all_lessons_count': count(*[_type == 'song' && brand == '${brand}' && ^._id in genre[]._ref ]._id),
            'lessons': *[_type == 'song' && brand == '${brand}' && ^._id in genre[]._ref ]{
              railcontent_id,
              title,
              "image": thumbnail.asset->url,
              "artist_name": artist->name,
              artist,
              difficulty,
              difficulty_string,
              web_url_path,
              published_on
            }[0...10]
          }
        |order(${sortOrder})
        [${start}...${end}]
      }`;
    } else {
        query = `
      {
        "entity": *[_type == 'song' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}] | order(${sortOrder}) [${start}...${end}] {
          railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "artist_name": artist->name,
          artist,
          difficulty,
          difficulty_string,
          web_url_path,
          published_on
        },
        "total": count(*[_type == 'song' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}])
      }
    `;
    }

    return fetchSanity(config, query);
}

/**
 * Fetch filter options for a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch filter options.
 * @returns {Promise<Object|null>} - The fetched filter options or null if not found.
 */
export async function fetchFilterOptions(config, brand) {
    const query = `
    {
      "difficulty": [
        {"type": "Introductory", "count": count(*[_type == 'song' && brand == ${brand} && difficulty_string == "Introductory"]._id)},
        {"type": "Beginner", "count": count(*[_type == 'song' && brand == ${brand} && difficulty_string == "Beginner"]._id)},
        {"type": "Intermediate", "count": count(*[_type == 'song' && brand == ${brand} && difficulty_string == "Intermediate"]._id)},
        {"type": "Advanced", "count": count(*[_type == 'song' && brand == ${brand} && difficulty_string == "Advanced"]._id)},
        {"type": "Expert", "count": count(*[_type == 'song' && brand == ${brand} && difficulty_string == "Expert"]._id)}
      ],
      "genre": *[_type == 'genre' && 'song' in filter_types] {
        "type": name,
        "count": count(*[_type == 'song' && brand == ${brand} && references(^._id)]._id)
      },
      "instrumentless": [
        {"type": "Full Song Only", "count": count(*[_type == 'song' && brand == ${brand} && instrumentless == false]._id)},
        {"type": "Instrument Removed", "count": count(*[_type == 'song' && brand == ${brand} && instrumentless == true]._id)}
      ]
    }
  `;

    return fetchSanity(config, query);
}

/**
 * Fetch the total count of songs for a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch the song count.
 * @returns {Promise<number|null>} - The total count of songs or null if an error occurs.
 */
export async function fetchSongCount(config, brand) {
    const query = `count(*[_type == 'song' && brand == "${brand}"])`;
    return fetchSanity(config, query);
}

/**
 * Fetch the latest workouts for the home page of a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch workouts.
 * @returns {Promise<Object|null>} - The fetched workout data or null if not found.
 */
export async function fetchWorkouts(config, brand) {
    const query = `*[_type == 'workout' && brand == '${brand}'] [0...5] {
          railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "artist_name": artist->name,
          artist,
          difficulty,
          difficulty_string,
          web_url_path,
          published_on
        } | order(published_on desc)[0...5]`
    return fetchSanity(config, query);
}

/**
 * Fetch the latest new releases for a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch new releases.
 * @returns {Promise<Object|null>} - The fetched new releases data or null if not found.
 */
export async function fetchNewReleases(config, brand) {
    const newTypes = {
        'drumeo': ["drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "question-and-answer", "student-collaborations", "live-streams", "live", "podcasts", "solos", "boot-camps", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'pianote': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'guitareo': ["student-review", "student-reviews", "question-and-answer", "archives", "recording", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'singeo': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"],
        'default': ["student-review", "student-reviews", "question-and-answer", "course", "play-along", "student-focus", "coach-stream", "learning-path-level", "unit", "quick-tips", "live", "question-and-answer", "student-review", "boot-camps", "song", "chords-and-scales", "pack", "podcasts", "workout", "challenge", "challenge-part"]
    };
    const typesString = arrayJoinWithQuotes(newTypes[brand] ?? newTypes['default']);
    const query = `*[_type in [${typesString}] && brand == '${brand}'] | order(releaseDate desc) [0...5] {
          railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "artist_name": artist->name,
          artist,
          difficulty,
          difficulty_string,
          web_url_path,
          published_on
        } | order(published_on desc)[0...5]`
    return fetchSanity(config, query);
}

/**
 * Fetch upcoming events for a specific brand.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} brand - The brand for which to fetch upcoming events.
 * @returns {Promise<Object|null>} - The fetched upcoming events data or null if not found.
 */
export async function fetchUpcomingEvents(config, brand) {
    const liveTypes = {
        'drumeo': ["drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "quick-tips", "question-and-answer", "student-collaborations", "live-streams", "live", "podcasts", "solos", "boot-camps", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor-drums", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"],
        'pianote': ["student-review", "student-reviews", "question-and-answer", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"],
        'guitareo': ["student-review", "student-reviews", "question-and-answer", "archives", "recording", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"],
        'singeo': ["student-review", "student-reviews", "question-and-answer", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"],
        'default': ["student-review", "student-reviews", "question-and-answer", "student-focus", "coach-stream", "live", "question-and-answer", "student-review", "boot-camps", "recording", "pack-bundle-lesson"]
    };
    const typesString = arrayJoinWithQuotes(liveTypes[brand] ?? liveTypes['default']);
    const now = getSanityDate(new Date());
    //TODO: status = 'scheduled'  is this handled in sanity?
    const query = `*[_type in [${typesString}] && brand == '${brand}' && published_on > '${now}']{
          railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "artist_name": artist->name,
          artist,
          difficulty,
          difficulty_string,
          web_url_path,
          published_on
        } | order(published_on asc)[0...5]`;
    return fetchSanity(config, query);
}

/**
 * Fetch content by a specific Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} id - The Railcontent ID of the content to fetch.
 * @returns {Promise<Object|null>} - The fetched content data or null if not found.
 */
export async function fetchByRailContentId(config, id) {
    const query = `*[railcontent_id = ${id}]{
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
    return fetchSanity(config, query);
}

/**
 * Fetch content by an array of Railcontent IDs.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {Array<string>} ids - The array of Railcontent IDs of the content to fetch.
 * @returns {Promise<Array<Object>|null>} - The fetched content data or null if not found.
 */
export async function fetchByRailContentIds(config, ids) {
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
    return fetchSanity(config, query);
}

/**
 * Fetch all content for a specific brand and type with pagination, search, and grouping options.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
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
 */
export async function fetchAll(config, brand, type, { page = 1, limit = 10, searchTerm = "", sort = "-published_on", includedFields = [], groupBy = "" }) {
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
            sortOrder = "artist->name asc";
            break;
        case "published_on":
            sortOrder = "published_on desc";
            break;
        case "-published_on":
            sortOrder = "published_on asc";
            break;
        case "-slug":
            sortOrder = "artist->name desc";
            break;
        case "-popularity":
            sortOrder = "popularity desc";
            break;
        default:
            sortOrder = "published_on asc";
            break;
    }

    // Determine the group by clause
    let query = "";
    if (groupBy !== "") {
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
                railcontent_id,
                title,
                "image": thumbnail.asset->url,
                difficulty,
                difficulty_string,
                web_url_path,
                published_on,
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
            railcontent_id,
            title,
            "image": thumbnail.asset->url,
            difficulty,
            difficulty_string,
            web_url_path,
            published_on
            },
            "total": count(*[_type == '${type}' && brand == "${brand}" ${searchFilter} ${includedFieldsFilter}])
        }
    `;
    }

    return fetchSanity(config, query);
}

/**
 * Fetch children content by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the parent content.
 * @returns {Promise<Array<Object>|null>} - The fetched children content data or null if not found.
 */
export async function fetchChildren(config, railcontentId) {
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
    return fetchSanity(config, query);
}

/**
 * Fetch the next lesson for a specific method by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next lesson data or null if not found.
 */
export async function fetchMethodNextLesson(config, railcontentId) {
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
    return fetchSanity(config, query);
}

/**
 * Fetch all children of a specific method by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the method.
 * @returns {Promise<Array<Object>|null>} - The fetched children data or null if not found.
 */
export async function fetchMethodChildren(config, railcontentId) {
    //TODO: Implement getByParentId include sum XP
    return fetchChildren(railcontentId);
}

/**
 * Fetch the next and previous lessons for a specific lesson by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @returns {Promise<Object|null>} - The fetched next and previous lesson data or null if found.
 */
export async function fetchNextPreviousLesson(config, railcontentId) {
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
    return fetchSanity(config, query);
}

/**
 * Fetch related lessons for a specific lesson by Railcontent ID and type.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the current lesson.
 * @param {string} type - The type of related lessons to fetch.
 * @returns {Promise<Array<Object>|null>} - The fetched related lessons data or null if not found.
 */
export async function fetchRelatedLessons(config, railcontentId, type) {
    let sort = 'published_on'
    if (type == 'rhythmic-adventures-of-captain-carson' ||
        type == 'diy-drum-experiments' ||
        type == 'in-rhythm') {
        sort = 'sort';
    }
    //TODO: Implement $this->contentService->getFiltered
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
    return fetchSanity(config, query);
}

/**
 * Fetch all content for a specific pack by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the pack.
 * @returns {Promise<Array<Object>|null>} - The fetched pack content data or null if not found.
 */
export async function fetchPackAll(config, railcontentId) {
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
    return fetchSanity(config, query);
}

/**
 * Fetch all children of a specific pack by Railcontent ID.
 * @param {Object} config - Configuration object containing token, projectId, dataset, version, and debug.
 * @param {string} railcontentId - The Railcontent ID of the pack.
 * @returns {Promise<Array<Object>|null>} - The fetched pack children data or null if not found.
 */
export async function fetchPackChildren(config, railcontentId) {
    return fetchChildren(railcontentId, 'pack');
}

/**
 * Fetch data from the Sanity API based on a provided query.
 * @param {Object} config - Configuration object containing the Sanity API settings.
 * @param {string} config.token - The API token for authenticating with Sanity.
 * @param {string} config.projectId - The project ID in Sanity.
 * @param {string} config.dataset - The dataset name in Sanity.
 * @param {string} config.version - The API version to use.
 * @param {boolean} [config.debug=false] - Flag to enable debug mode, which logs the query and results.
 * @param {string} query - The GROQ query to execute against the Sanity API.
 * @returns {Promise<Object|null>} - The first result from the query, or null if an error occurs or no results are found.
 */
async function fetchSanity({ token, projectId, dataset, version, debug = false }, query) {
    if (debug) {
        console.log("fetchSanity Query:", query);
    }
    const encodedQuery = encodeURIComponent(query);
    const url = `https://${projectId}.apicdn.sanity.io/v${version}/data/query/${dataset}?query=${encodedQuery}`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, {headers});
        const result = await response.json();
        if (result.result) {
            if (debug) {
                console.log("fetchSanity Results:", result.result);
            }
            return result.result[0];
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('sanityQueryService: Fetch error:', error);
        return null;
    }
}

function arrayJoinWithQuotes(array, delimiter = ',') {
    const wrapped = array.map(value => `'${value}'`);
    return wrapped.join(delimiter)
}

function getSanityDate(date) {
    return date.toISOString();
}

