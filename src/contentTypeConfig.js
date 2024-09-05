import {nullToUndefined, q} from 'groqd';

const DEFAULT_FIELDS = {
    sanity_id: ['_id', q.string()],
    id: ['railcontent_id', q.number()],
    railcontent_id: q.number(),
    artist_name: ['coalesce(artist->name, instructor[0]->name)', q.string()],
    artist: q.object(),
    title: q.string(),
    image: ['thumbnail.asset->url', q.string()],
    thumbnail: ['thumbnail.asset->url', q.string()],
    difficulty: q.number(),
    difficulty_string: q.string(),
    web_url_path: q.string(),
    published_on: q.string(),
    type: ['_type', q.string()],
    progress_percent: q.number().optional(),
    length_in_seconds: ['coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)', q.number()],
    brand: q.string(),
    genre: ['genre[]->name', q.array(q.string())],
    status: q.string().optional(),
    slug: ['slug.current', q.string()],
};

const CONTENT_TYPE_CONFIG = {
    song: {
        fields: {
            soundslice: q.array(),
            instrumentless: q.boolean(),
        },
        relationships: {
            artist: { isOneToOne: true }
        }
    },
    challenge: {
        fields: {
            enrollment_start_time: q.string(),
            enrollment_end_time: q.string(),
            registration_url: q.string(),
            lesson_count: ['child_count', q.number()],
            primary_cta_text: q.select({
                'dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now())': q.literal("Notify Me"),
                default: q.literal("Start Challenge")
            }),
            challenge_state: q.string(),
            challenge_state_text: q.string(),
        }
    },
    course: {
        fields: {
            lesson_count: ['child_count', q.number()],
            instructors: ['instructor[]->name', q.array(q.string())],
        }
    },
    'student-focus': {
        fields: {
            instructors: ['instructor[]->name', q.array(q.string())],
        }
    },
    method: {
        fields: {
            description: ['description[0].children[0].text', q.string()],
            hide_from_recsys: q.boolean(),
            image: ['thumbnail.asset->url', q.string()],
            instructors: ['instructor[]->name', q.array(q.string())],
            lesson_count: ['child_count', q.number()],
            length_in_seconds: q.number(),
            permission: q.string(),
            popularity: q.number(),
            published_on: q.string(),
            railcontent_id: q.string(),
            thumbnail_logo: ['logo_image_url.asset->url', q.string()],
            title: q.string(),
            total_xp: q.number(),
            type: ['_type', q.string()],
            url: ['web_url_path', q.string()],
            xp: q.number(),
        }
    },
    workout: {
        fields: {
            artists: ['select(artist->name != null => [artist->name], instructor[]->name)', q.array(q.string())],
        }
    },
    'quick-tips': {
        fields: {
            instructors: ['instructor[]->name', q.array(q.string())],
        }
    },
    rudiment: {
        fields: {
            sheet_music_thumbnail_url: q.string(),
        }
    },
    'play-along': {
        fields: {
            style: ['genre[]->name', q.array(q.string())],
            mp3_no_drums_no_click_url: q.string(),
            mp3_yes_drums_yes_click_url: q.string(),
            mp3_no_drums_yes_click_url: q.string(),
            mp3_yes_drums_no_click_url: q.string(),
            bpm: q.number(),
        }
    },
    pack: {
        fields: {
            lesson_count: ['child_count', q.number()],
            xp: q.number(),
            description: ['description[0].children[0].text', q.string()],
            instructors: ['instructor[]->name', q.array(q.string())],
        }
    }
};

function getGrabObject(contentType) {
    const contentTypeFields = CONTENT_TYPE_CONFIG[contentType]?.fields || {};

    return nullToUndefined({ ...DEFAULT_FIELDS, ...contentTypeFields });
}

function filtersToGroq(filters) {
    return (base) => filters.reduce((acc, filter) => {
        const [key, value] = filter.split(',');
        switch (key) {
            case 'difficulty':
                return acc.filter(`difficulty_string == "${value}"`);
            case 'genre':
                return acc.filter(`"${value}" in genre[]->name`);
            case 'topic':
                return acc.filter(`"${value}" in topic[]->name`);
            case 'instrumentless':
                return acc.filter(`instrumentless == ${value}`);
            default:
                return acc.filter(`${key} == "${value}"`);
        }
    }, base);
}

export {
    getGrabObject,
    filtersToGroq,
    CONTENT_TYPE_CONFIG,
    DEFAULT_FIELDS,
};