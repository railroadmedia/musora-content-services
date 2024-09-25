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

const contentWithInstructorsField = {
    'fields': [
        '"instructors": instructor[]->name',
    ]
}

const contentWithSortField = {
    'fields': [
        'sort',
    ]
}
const showsTypes = {
    'drumeo': ['drum-fest-international-2022', 'spotlight', 'the-history-of-electronic-drums', 'backstage-secret', 'quick-tips', 'question-and-answer', 'student-collaboration',
         'live', 'podcast', 'solo', 'boot-camp', 'gear-guide', 'performance', 'in-rhythm', 'challenges', 'on-the-road', 'diy-drum-experiment', 'rhythmic-adventures-of-captain-carson',
        'study-the-greats', 'rhythms-from-another-planet', 'tama', 'paiste-cymbals', 'behind-the-scenes', 'exploring-beats', 'sonor'
    ],
    'pianote': ['student-review', 'question-and-answer'],
    'guitareo': ['student-review', 'question-and-answer', 'archives', 'recording'],
    'singeo': ['student-review', 'question-and-answer']
}


let contentTypeConfig = {
    'song': {
        'fields': [
            'album',
            'soundslice',
            'instrumentless',
        ],
        'relationships': {
            'artist': {
                isOneToOne: true
            }
        },
        'slug':'songs',
    },
    'song-tutorial': {
        'fields': [
            '"lesson_count": child_count',
            `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
            }`,
        ]
    },
    'challenge':{
        'fields': [
            'enrollment_start_time',
            'enrollment_end_time',
            'registration_url',
            '"lesson_count": child_count',
            '"primary_cta_text": select(dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now()) => "Notify Me", "Start Challenge")',
            'challenge_state',
            'challenge_state_text',
            `"description": ${descriptionField}`,
            'total_xp',
            'xp',
            '"instructors": instructor[]->name',
            '"header_image_url": thumbnail.asset->url',
            '"logo_image_url": logo_image_url.asset->url',
        ]
    },
    'course': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name',
            `"description": ${descriptionField}`,
            'resource',
            'xp',
            'total_xp',
            `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
            }`,
        ],
        'slug':'courses',
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
    'learning-path-course': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name',
            `"description": ${descriptionField}`,
            'resource',
            'xp',
            'total_xp',
            `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
            }`,
        ]
    },
    'workout': {
        'fields': [
            artistOrInstructorNameAsArray(),
        ],
        'slug':'workouts',
    },
    'play-along': {
        'fields': [
            '"style": genre[]->name',
            'mp3_no_drums_no_click_url',
            'mp3_yes_drums_yes_click_url',
            'mp3_no_drums_yes_click_url',
            'mp3_yes_drums_no_click_url',
            'bpm',
        ],
        'slug':'play-alongs',
    },
    'pack': {
        'fields': [
            '"lesson_count": child_count',
            'xp',
            `"description": ${descriptionField}`,
            '"instructors": instructor[]->name',
            '"logo_image_url": logo_image_url.asset->url',
            'total_xp'
        ],
    },
    'rudiment': {
        'fields': [
            'sheet_music_thumbnail_url',
        ],
        'slug':'rudiments',
    },
    'routine':{
        'fields': [
            `"description": ${descriptionField}`,
            'high_soundslice_slug',
            'low_soundslice_slug'
        ],
        'slug':'routines',
    },
    'pack-children': {
        'fields': [
            'child_count',
            `"children": child[]->{
                "description": ${descriptionField},
                ${getFieldsForContentType()}
            }`,
            '"resources": resource',
            '"image": logo_image_url.asset->url',
            '"thumbnail": thumbnail.asset->url',
            '"light_logo": light_mode_logo_url.asset->url',
            '"dark_logo": dark_mode_logo_url.asset->url',
            `"description": ${descriptionField}`,
            'total_xp',
        ]
    },
    'foundation': {
        'fields': [
            `"description": ${descriptionField}`,
            `"instructors":instructor[]->name`,
            `"units": child[]->{
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
                xp,
            }`
        ]
    },
    'unit': {
        'fields': [
            '"lesson_count": child_count',
            '"instructors": instructor[]->name',
            `"description": ${descriptionField}`,
            'resource',
            'xp',
            'total_xp',
            `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
            }`,
        ],
    },
    'instructor': {
        'fields': [
            '"coach_top_banner_image": coach_top_banner_image.asset->url',
            '"coach_bottom_banner_image": coach_bottom_banner_image.asset->url',
            '"coach_card_image": coach_card_image.asset->url',
            '"coach_featured_image": coach_featured_image.asset->url',
            '"coach_top_banner_image": coach_top_banner_image.asset->url',
            'focus',
            'focus_text',
            'forum_thread_id',
            'long_bio',
            'name',
            'short_bio',
            'bands',
            'endorsements',
        ]
    },
    // content with just the added 'instructors' Field
    'student-focus': contentWithInstructorsField,
    'quick-tips': contentWithInstructorsField,
    'drum-fest-international-2022': contentWithInstructorsField,
    'spotlight': contentWithInstructorsField,
    'the-history-of-electronic-drums': contentWithInstructorsField,
    'backstage-secret': contentWithInstructorsField,
    'question-and-answer': contentWithInstructorsField,
    'student-collaboration': contentWithInstructorsField,
    'live': { ...contentWithInstructorsField, 'slug': 'live-streams' },
    'solo': { ...contentWithInstructorsField, 'slug': 'solos' },
    'boot-camp': contentWithInstructorsField,
    'gear-guids': contentWithInstructorsField,
    'performance': contentWithInstructorsField,
    'challenges': contentWithInstructorsField,
    'on-the-road': contentWithInstructorsField,
    // content with just the added 'sort' field
    'podcast': contentWithSortField,
    'in-rhythm': contentWithSortField,
    'diy-drum-experiment': contentWithSortField,
    'rhythmic-adventures-of-captain-carson': contentWithSortField,
    'study-the-greats': contentWithSortField,
    'rhythms-from-another-planet': contentWithSortField,
    'paiste-cymbals': contentWithInstructorsField,
    'behind-the-scenes': contentWithSortField,
    'exploring-beats': contentWithSortField,
    'sonor': contentWithSortField,
}

function getNewReleasesTypes(brand) {
    const baseNewTypes = ["student-review", "student-review", "student-focus", "coach-stream", "live", "question-and-answer", "boot-camps", "quick-tips", "workout", "challenge", "challenge-part", "podcasts", "pack", "song", "learning-path-level", "play-along", "course", "unit"];
    switch(brand) {        
        case 'drumeo':
            return [...baseNewTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "student-collaborations", "live", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor"];
        case 'guitareo': 
            return [...baseNewTypes, "archives", "recording", "chords-and-scales"];
        case 'pianote':    
        case 'singeo':
        default:
            return baseNewTypes
        }
}

function getUpcomingEventsTypes(brand) {
    const baseLiveTypes = ["student-review", "student-review", "student-focus", "coach-stream", "live", "question-and-answer", "boot-camps", "quick-tips", "recording", "pack-bundle-lesson"];
    switch(brand) {
        case 'drumeo': 
            return [...baseLiveTypes, "drum-fest-international-2022", "spotlight", "the-history-of-electronic-drums", "backstage-secrets", "student-collaborations", "live", "podcasts", "solos", "gear-guides", "performances", "in-rhythm", "challenges", "on-the-road", "diy-drum-experiments", "rhythmic-adventures-of-captain-carson", "study-the-greats", "rhythms-from-another-planet", "tama-drums", "paiste-cymbals", "behind-the-scenes", "exploring-beats", "sonor"];
        case 'guitareo':
            return [...baseLiveTypes, "archives"];
        case 'pianote':
        case 'singeo':
        default:
            return baseLiveTypes;
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
/**
 * Takes the included fields array and returns a string that can be used in a groq query.
 * @param {Array<string>} filters - An array of strings that represent applied filters. This should be in the format of a key,value array. eg. ['difficulty,Intermediate',
 *     'genre,rock']
 * @returns {string} - A string that can be used in a groq query
 */
function filtersToGroq(filters) {
    const groq = filters.map(field => {
            let [key, value] = field.split(',');
            if(key && value && field.split(',').length === 2){
                switch (key) {
                    case 'difficulty':
                      return `&& difficulty_string == "${value}"`;
                    case 'genre':
                      return `&& genre[]->name match "${value}"`;
                    case 'topic':
                      return `&& topic[]->name match "${value}"`;
                    case 'instrumentless':
                      return `&& instrumentless == ${value}`;
                    case 'creativity':
                      return `&& creativity[]->name match "${value}"`;
                    case 'theory':
                      return `&& theory[]->name match "${value}"`;
                    case 'essentials':
                      return `&& essential[]->name match "${value}"`;
                    case 'lifestyle':
                      return `&& lifestyle[]->name match "${value}"`;
                    default:
                      return `&& ${key} == ${/^\d+$/.test(value) ? value : `"$${value}"`}`;
                  }
            }
            
            return `&& ${field}`;
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
    getNewReleasesTypes,
    getUpcomingEventsTypes,
    showsTypes,
}
