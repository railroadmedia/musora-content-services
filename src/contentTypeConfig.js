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
    'workout': {
        'fields': [
            artistOrInstructorNameAsArray(),
        ]
    },
    'quick-tips': {
        'fields': [
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
            '"instructors": instructor[]->name'
        ]
    },
    'spotlight': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'the-history-of-electronic-drums': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'backstage-secrets': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'question-and-answer': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'student-collaborations': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'live': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'podcasts': {
        'fields': [
            'sort',
        ]
    },
    'solos': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'boot-camps': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'gear-guids': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'performances': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'in-rhythm': {
        'fields': [
            'sort',
        ]
    },
    'challenges': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'on-the-road': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'diy-drum-experiments': {
        'fields': [
            'sort',
        ]
    },
    'rhythmic-adventures-of-captain-carson': {
        'fields': [
            'sort',
        ]
    },
    'study-the-greats': {
        'fields': [
            'sort',
        ]
    },
    'rhythms-from-another-planet': {
        'fields': [
            'sort',
        ]
    },
    'paiste-cymbals': {
        'fields': [
            '"instructors": instructor[]->name'
        ]
    },
    'behind-the-scenes': {
        'fields': [
            'sort',
        ]
    },
    'exploring-beats': {
        'fields': [
            'sort',
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
            'xp',
           `"description": ${descriptionField}`,
           '"instructors": instructor[]->name'
        ],
    },
    'routine':{
        'fields': [
            'description',
            'high_soundslice_slug',
            'low_soundslice_slug'
        ]
    }
}

function artistOrInstructorName(key='artist_name') {
    return `'${key}': coalesce(artist->name, instructor[0]->name)`;
}

function artistOrInstructorNameAsArray(key='artists') {
    return `'${key}': select(artist->name != null => [artist->name], instructor[]->name)`;
}

function getFieldsForContentType(contentType, asQueryString=true) {
    console.log('this was called, ', contentType)
    const fields = contentType ? DEFAULT_FIELDS.concat(contentTypeConfig?.[contentType]?.fields ?? []) : DEFAULT_FIELDS;
    return asQueryString ? fields.toString() + ',' : fields;
}
/**
 * Takes the included fields array and returns a string that can be used in a groq query.
 * @param {Array<string>} filters - An array of strings that represent applied filters. This should be in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock']
 * @returns {string} - A string that can be used in a groq query
 */
function filtersToGroq(filters) {
    const groq = filters.map(field => {
            let [key, value] = field.split(',');
            switch (key) {
              case 'difficulty':
                return `&& difficulty_string == "${value}"`;
              case 'genre':
                return `&& genre[]->name match "${value}"`;
              case 'topic':
                return `&& topic[]->name match "${value}"`;
              case 'instrumentless':
                return `&& instrumentless == ${value}`;
              default:
                return `&& ${key} == ${/^\d+$/.test(value) ? value : `"$${value}"`}`;
            }
        }).join(' ');
    return groq;
}

module.exports = {
    contentTypeConfig,
    descriptionField,
    artistOrInstructorName,
    artistOrInstructorNameAsArray,
    getFieldsForContentType,
    DEFAULT_FIELDS,
    assignmentsField,
    filtersToGroq,
}
