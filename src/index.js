// Sanity.io Service
const token = process.env.SANITY_API_TOKEN;
const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET;
const version = '2021-06-07'; // API version
const debug = process.env.DEBUG || false;

export async function fetchSongById(documentId) {
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
    return fetchSanity(query);
}


export async function fetchArtists(brand) {
    const query = `
    *[_type == "artist"]{
      name,
      "lessonsCount": count(*[_type == "song" && brand == "${brand}" && references(^._id)])
    }[lessonsCount > 0]`;
    return fetchSanity(query);
}


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

    return fetchSanity(query);
}

// Fetch All Songs for a Brand with Pagination and Search
export async function fetchAllSongs(brand, page = 1, limit = 10, searchTerm = "", sort = "-published_on", includedFields = [], groupBy = "") {
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

    return fetchSanity(query);
}

// Fetch Filter Options
export async function fetchFilterOptions(brand) {
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

    return fetchSanity(query);
}


//FETCH SONG COUNT
export async function fetchSongCount(brand) {
    const query = `count(*[_type == 'song' && brand == "${brand}"])`;
    return fetchSanity(query);
}

//Home Page
export async function fetchWorkouts(brand) {
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
    return fetchSanity(query);
}

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
    return fetchSanity(query);
}

export async function fetchUpcomingEvents(brand) {
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
    return fetchSanity(query);
}

//General
export async function fetchByRailContentId(id) {
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
    return fetchSanity(query);
}

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
    return fetchSanity(query);
}

export async function fetchAll(brand, type, page = 1, limit = 10, searchTerm = "", sort = "-published_on", includedFields = [], groupBy = "") {
    //Todo: implement /railcontent/content?brand=drumeo&limit=10&page=1&sort=-published_on&included_fields[]=topic,Creativity&included_fields[]=topic,Essentials&included_types[]=workout&include_future_scheduled_content_only=true&is_all=false&count_filter_items=true&tabs[]=
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

    return fetchSanity(query);
}

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
    return fetchSanity(query);
}

//Method

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
    return fetchSanity(query);
}

export async function fetchMethodChildren(railcontentId) {
    //TODO: Implement getByParentId include sum XP
    return fetchChildren(railcontentId);
}

//Lesson Page

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
    return fetchSanity(query);
}

export async function fetchRelatedLessons(railcontentId, type) {
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
    return fetchSanity(query);
}

//Packs
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
    return fetchSanity(query);
}

export async function fetchPackChildren(railcontentId) {
    return fetchChildren(railcontentId, 'pack');
}




//Helpers
async function fetchSanity(query) {
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

