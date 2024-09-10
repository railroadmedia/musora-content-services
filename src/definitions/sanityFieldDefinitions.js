import {q, sanityImage, nullToUndefined} from 'groqd';

const SANITY_FIELD_DEFINITIONS = {
    sanity_id: ['_id', q.string()],
    id: ['railcontent_id', q.number().optional()],
    railcontent_id: q.number().optional(),
    artist_name: ['coalesce(artist->name, instructor[0]->name)', q.string().optional()],
    artist: q('artist').deref().grab({
        name: q.string(),
        thumbnail_url: sanityImage('thumbnail_url'),
    }),
    title: q.string(),
    image: ['thumbnail.asset->url', q.string().optional()],
    thumbnail: ['thumbnail.asset->url', q.string().optional()],
    difficulty: q.number().optional(),
    difficulty_string: q.string().optional(),
    web_url_path: q.string().optional(),
    published_on: q.string().optional(),
    type: ['_type', q.string().optional()],
    progress_percent: q.number().optional(),
    length_in_seconds: ['coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)', q.number().optional()],
    brand: q.string().optional(),
    genre: ['genre[]->name', q.array(q.string()).optional()],
    status: q.string().optional(),
    slug: ['slug.current', q.string().optional()],
    soundslice: q.array(q.object({
        soundslice_length_in_second: q.number(),
        soundslice_slug: q.string(),
        soundslice_title: q.string(),
    })),
    instrumentless: q.boolean().optional(),
    enrollment_start_time: q.string().optional(),
    enrollment_end_time: q.string().optional(),
    registration_url: q.string().optional(),
    lesson_count: ['child_count', q.number().optional()],
    primary_cta_text: q.select({
        'dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now())': q.literal("Notify Me"),
        default: q.literal("Start Challenge")
    }),
    challenge_state: q.string().optional(),
    challenge_state_text: q.string().optional(),
    instructors: ['instructor[]->name', q.array(q.string()).optional()],
    description: ['description[0].children[0].text', q.string().optional()],
    hide_from_recsys: q.boolean().optional(),
    permission: q.string().optional(),
    popularity: q.number().optional(),
    thumbnail_logo: ['logo_image_url.asset->url', q.string().optional()],
    total_xp: q.number().optional(),
    url: ['web_url_path', q.string().optional()],
    xp: q.number().optional(),
    artists: ['select(artist->name != null => [artist->name], instructor[]->name)', q.array(q.string()).optional()],
    sheet_music_thumbnail_url: q.string().optional(),
    style: ['genre[]->name', q.array(q.string()).optional()],
    mp3_no_drums_no_click_url: q.string().optional(),
    mp3_yes_drums_yes_click_url: q.string().optional(),
    mp3_no_drums_yes_click_url: q.string().optional(),
    mp3_yes_drums_no_click_url: q.string().optional(),
    bpm: q.number().optional(),
};

const CONTENT_TYPE_FIELDS = {
    defaults: {
        fields: {
            sanity_id: SANITY_FIELD_DEFINITIONS.sanity_id,
            id: SANITY_FIELD_DEFINITIONS.id,
            railcontent_id: SANITY_FIELD_DEFINITIONS.railcontent_id,
            artist_name: SANITY_FIELD_DEFINITIONS.artist_name,
            artist: SANITY_FIELD_DEFINITIONS.artist,
            title: SANITY_FIELD_DEFINITIONS.title,
            image: SANITY_FIELD_DEFINITIONS.image,
            thumbnail: SANITY_FIELD_DEFINITIONS.thumbnail,
            difficulty: SANITY_FIELD_DEFINITIONS.difficulty,
            difficulty_string: SANITY_FIELD_DEFINITIONS.difficulty_string,
            web_url_path: SANITY_FIELD_DEFINITIONS.web_url_path,
            published_on: SANITY_FIELD_DEFINITIONS.published_on,
            type: SANITY_FIELD_DEFINITIONS.type,
            progress_percent: SANITY_FIELD_DEFINITIONS.progress_percent,
            length_in_seconds: SANITY_FIELD_DEFINITIONS.length_in_seconds,
            brand: SANITY_FIELD_DEFINITIONS.brand,
            genre: SANITY_FIELD_DEFINITIONS.genre,
            status: SANITY_FIELD_DEFINITIONS.status,
            slug: SANITY_FIELD_DEFINITIONS.slug,
        }
    },
    song: {
        fields: {
            soundslice: SANITY_FIELD_DEFINITIONS.soundslice,
            instrumentless: SANITY_FIELD_DEFINITIONS.instrumentless,
        },
        relationships: {
            artist: {isOneToOne: true}
        }
    },
    challenge: {
        fields: {
            enrollment_start_time: SANITY_FIELD_DEFINITIONS.enrollment_start_time,
            enrollment_end_time: SANITY_FIELD_DEFINITIONS.enrollment_end_time,
            registration_url: SANITY_FIELD_DEFINITIONS.registration_url,
            lesson_count: SANITY_FIELD_DEFINITIONS.lesson_count,
            primary_cta_text: SANITY_FIELD_DEFINITIONS.primary_cta_text,
            challenge_state: SANITY_FIELD_DEFINITIONS.challenge_state,
            challenge_state_text: SANITY_FIELD_DEFINITIONS.challenge_state_text,
        }
    },
    course: {
        fields: {
            lesson_count: SANITY_FIELD_DEFINITIONS.lesson_count,
            instructors: SANITY_FIELD_DEFINITIONS.instructors,
        }
    },
    'student-focus': {
        fields: {
            instructors: SANITY_FIELD_DEFINITIONS.instructors,
        }
    },
    method: {
        fields: {
            description: SANITY_FIELD_DEFINITIONS.description,
            hide_from_recsys: SANITY_FIELD_DEFINITIONS.hide_from_recsys,
            image: SANITY_FIELD_DEFINITIONS.image,
            instructors: SANITY_FIELD_DEFINITIONS.instructors,
            lesson_count: SANITY_FIELD_DEFINITIONS.lesson_count,
            length_in_seconds: SANITY_FIELD_DEFINITIONS.length_in_seconds,
            permission: SANITY_FIELD_DEFINITIONS.permission,
            popularity: SANITY_FIELD_DEFINITIONS.popularity,
            published_on: SANITY_FIELD_DEFINITIONS.published_on,
            railcontent_id: SANITY_FIELD_DEFINITIONS.railcontent_id,
            thumbnail_logo: SANITY_FIELD_DEFINITIONS.thumbnail_logo,
            title: SANITY_FIELD_DEFINITIONS.title,
            total_xp: SANITY_FIELD_DEFINITIONS.total_xp,
            type: SANITY_FIELD_DEFINITIONS.type,
            url: SANITY_FIELD_DEFINITIONS.url,
            xp: SANITY_FIELD_DEFINITIONS.xp,
        }
    },
    workout: {
        fields: {
            artists: SANITY_FIELD_DEFINITIONS.artists,
        }
    },
    'quick-tips': {
        fields: {
            instructors: SANITY_FIELD_DEFINITIONS.instructors,
        }
    },
    rudiment: {
        fields: {
            sheet_music_thumbnail_url: SANITY_FIELD_DEFINITIONS.sheet_music_thumbnail_url,
        }
    },
    'play-along': {
        fields: {
            style: SANITY_FIELD_DEFINITIONS.style,
            mp3_no_drums_no_click_url: SANITY_FIELD_DEFINITIONS.mp3_no_drums_no_click_url,
            mp3_yes_drums_yes_click_url: SANITY_FIELD_DEFINITIONS.mp3_yes_drums_yes_click_url,
            mp3_no_drums_yes_click_url: SANITY_FIELD_DEFINITIONS.mp3_no_drums_yes_click_url,
            mp3_yes_drums_no_click_url: SANITY_FIELD_DEFINITIONS.mp3_yes_drums_no_click_url,
            bpm: SANITY_FIELD_DEFINITIONS.bpm,
        }
    },
    pack: {
        fields: {
            lesson_count: SANITY_FIELD_DEFINITIONS.lesson_count,
            xp: SANITY_FIELD_DEFINITIONS.xp,
            description: SANITY_FIELD_DEFINITIONS.description,
            instructors: SANITY_FIELD_DEFINITIONS.instructors,
        }
    }
};

function getSanityFieldsToGrab(contentType, includeDefault= true) {

    let defaultFields = includeDefault ? CONTENT_TYPE_FIELDS.defaults.fields : {};
    let fields = {...defaultFields, ...(CONTENT_TYPE_FIELDS[contentType]?.fields || {})};

    return nullToUndefined(fields);
}


function filtersToGroq(filters) {
    return (base) => filters.reduce((acc, filter) => {
        const [key, value] = filter.split(',');
        switch (key) {
            case 'difficulty':
                return acc.filter(`difficulty_string == "${value}"`);
            case 'genre':
            case 'topic':
                return acc.filter(`"${value}" in ${key}[]->name`);
            default:
                return acc.filter(`${key} == "${value}"`);
        }
    }, base);
}

export {
    SANITY_FIELD_DEFINITIONS,
    CONTENT_TYPE_FIELDS,
    getSanityFieldsToGrab,
    filtersToGroq,
};