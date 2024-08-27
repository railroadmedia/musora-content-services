const DEFAULT_FIELDS = [
    "'sanity_id' : _id",
    "'id': railcontent_id",
    'railcontent_id',
    artistOrInstructorName(),
    "artist",
    "title",
    "'image': thumbnail.asset->url",
    "'thumbnail': thumbnail.asset->url",
    "difficulty",
    "difficulty_string",
    "web_url_path",
    "published_on",
    "'type': _type",
    "progress_percent",
    "'length_in_seconds' : coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)",
    "brand",
    "'genre': genre[]->name",
    'status',
    "'slug' : slug.current",
];

const descriptionField = 'description[0].children[0].text';

const assignmentsField = `"assignments":assignment[]{
    "id": railcontent_id,
        "soundslice_slug": assignment_soundslice,
        "title": assignment_title,
        "sheet_music_image_url": assignment_sheet_music_image,
        "timecode": assignment_timecode,
        "description": assignment_description
},`

let contentTypeConfig = {
    'song': {
        'fields': [
            'soundslice',
            'instrumentless',
        ],
        'relationships': {
            'artist': {
                isOneToOne: true
            }
        }
    },
    'challenge':{
        'fields':[
            'enrollment_start_time',
            'enrollment_end_time',
            'registration_url',
            '"lesson_count": child_count',
            '"primary_cta_text": select(dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now()) => "Notify Me", "Start Challenge")',
            'challenge_state',
            'challenge_state_text',
        ]
    },
    'course': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name'
        ]
    },
    'student-focus': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'method': {
        'fields': [
            `"description": ${descriptionField}`,
            'hide_from_recsys',
            '"image": thumbnail.asset->url',
            '"instructors":instructor[]->name',
            '"lesson_count": child_count',
            'length_in_seconds',
            'permission',
            'popularity',
            'published_on',
            'railcontent_id',
            '"thumbnail_logo": logo_image_url.asset->url',
            'title',
            'total_xp',
            '"type": _type',
            '"url": web_url_path',
            'xp',
        ]
    },
    'quick-tips': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'rudiment': {
        'fields': [
            'sheet_music_thumbnail_url',
        ]
    },
    'drum-fest-international-aa2022': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'spotlight': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'the-history-of-electronic-drums': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'backstage-secrets': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'question-and-answer': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'student-collaborations': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'live': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'podcasts': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'solos': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'boot-camps': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'gear-guids': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'performances': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'in-rhythm': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'challenges': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'on-the-road': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'diy-drum-experiments': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'rhythmic-adventures-of-captain-carson': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'study-the-greats': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'rhythms-from-another-planet': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'paiste-cymbals': {
        'fields': [
            'length_in_seconds',
            '"instructors": instructor[]->name'
        ]
    },
    'behind-the-scenes': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'exploring-beats': {
        'fields': [
            'sort',
            'length_in_seconds',
        ]
    },
    'play-along': {
        'fields': [
            '"style": genre[]->name',
            'mp3_no_drums_no_click_url',
            'mp3_yes_drums_yes_click_url',
            'mp3_no_drums_yes_click_url',
            'mp3_yes_drums_no_click_url',
            'bpm',
        ]
    },
    'pack': {
        'fields': [
            '"lesson_count": child_count',
            '"description": description[][0].children[0].text',
            'xp',
           `"description": ${descriptionField}`,
        ],
    }
}

function artistOrInstructorName(key='artist_name') {
    return `'${key}': coalesce(artist->name, instructor[0]->name)`;
}

function artistOrInstructorNameAsArray(key='artists') {
    return `'${key}': select(artist->name != null => [artist->name], instructor[]->name)`;
}

function getFieldsForContentType(contentType, asQueryString=true) {
    const fields = contentType ? DEFAULT_FIELDS.concat(contentTypeConfig?.[contentType]?.fields ?? []) : DEFAULT_FIELDS;
    return asQueryString ? fields.toString() + ',' : fields;
}

module.exports = {
    contentTypeConfig,
    artistOrInstructorName,
    artistOrInstructorNameAsArray,
    getFieldsForContentType,
    DEFAULT_FIELDS,
    assignmentsField
}
