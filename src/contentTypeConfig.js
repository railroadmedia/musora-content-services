//import {AWSUrl, CloudFrontURl} from "./services/config";
import {Tabs} from "./contentMetaData.js";

export const AWSUrl = 'https://s3.us-east-1.amazonaws.com/musora-web-platform'
export const CloudFrontURl = 'https://d3fzm1tzeyr5n3.cloudfront.net'
export const DEFAULT_FIELDS = [
  "'sanity_id' : _id",
  "'id': railcontent_id",
  'railcontent_id',
  artistOrInstructorName(),
  'artist',
  'title',
  "'image': thumbnail.asset->url",
  "'thumbnail': thumbnail.asset->url",
  'difficulty',
  'difficulty_string',
  'web_url_path',
  "'url': web_url_path",
  'published_on',
  "'type': _type",
  'progress_percent',
  "'length_in_seconds' : coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)",
  'brand',
  "'genre': genre[]->name",
  'status',
  "'slug' : slug.current",
  "'permission_id': permission[]->railcontent_id",
  'xp',
  'child_count',
]
export const DEFAULT_CHILD_FIELDS = [
  `"id": railcontent_id`,
  `title`,
  `"image": thumbnail.asset->url`,
  `"instructors": instructor[]->name`,
  `length_in_seconds`,
]

export const descriptionField = 'description[0].children[0].text'
// this pulls both any defined resources for the document as well as any resources in the parent document
export const resourcesField = `[
          ... resource[]{resource_name, _key, "resource_url": coalesce('${CloudFrontURl}'+string::split(resource_aws.asset->fileURL, '${AWSUrl}')[1], resource_url )},
          ... *[railcontent_id == ^.parent_content_data[0].id] [0].resource[]{resource_name, _key, "resource_url": coalesce('${CloudFrontURl}'+string::split(resource_aws.asset->fileURL, '${AWSUrl}')[1], resource_url )},
          ]`

/*
 *  NOTE: TP-366 - Arrays can be either arrays of different objects or arrays of different primitives, not both
 *  updated query so assignment_sheet_music_image can be either an image or a URL
 *  see: https://www.sanity.io/docs/array-type#fNBIr84P
 */
export const assignmentsField = `"assignments":assignment[]{
    "id": railcontent_id,
        "soundslice_slug": assignment_soundslice,
        "title": assignment_title,
        "sheet_music_image_url": 
          coalesce(assignment_sheet_music_image_new[]{
              _type == 'Image' => {
                'url': asset->url
              },
              _type == 'URL' => {
                url
              }
            }.url,  assignment_sheet_music_image),
        "timecode": assignment_timecode,
        "description": coalesce(assignment_description,'')
},`

const contentWithInstructorsField = {
  fields: ['"instructors": instructor[]->name'],
}

const contentWithSortField = {
  fields: ['sort'],
}
export const showsTypes = {
  drumeo: [
    'odd-times',
    'drum-fest-international-2022',
    'spotlight',
    'the-history-of-electronic-drums',
    'backstage-secret',
    'quick-tips',
    'question-and-answer',
    'student-collaboration',
    'live',
    'podcast',
    'solo',
    'boot-camp',
    'gear-guide',
    'performance',
    'in-rhythm',
    'challenges',
    'on-the-road',
    'diy-drum-experiment',
    'rhythmic-adventures-of-captain-carson',
    'study-the-greats',
    'rhythms-from-another-planet',
    'tama',
    'paiste-cymbals',
    'behind-the-scenes',
    'exploring-beats',
    'sonor',
  ],
  pianote: ['student-review', 'question-and-answer'],
  guitareo: ['student-review', 'question-and-answer', 'archives', 'recording'],
  singeo: ['student-review', 'question-and-answer'],
}

export const coachLessonsTypes = [
  'course',
  'course-part',
  'coach-stream',
  'student-focus',
  'quick-tips',
  'pack',
  'semester-pack',
  'question-and-answer',
  'song-tutorial',
  'song-tutorial-children',
  'workout',
]

export const childContentTypeConfig = {
  'song-tutorial': [
    `"genre": genre[]->name`,
    `difficulty_string`,
    `"type": _type`,
  ]
}

export const singleLessonTypes = ['quick-tips', 'rudiment', 'coach-lessons'];
export const practiceAlongsLessonTypes = ['workout', 'boot-camp','challenges'];
export const performancesLessonTypes = ['performance','solo','drum-fest-international-2022'];
export const documentariesLessonTypes = ['tama','sonor','history-of-electronic-drums','paiste-cymbals'];
export const liveArchivesLessonTypes = ['podcast', 'coach-stream', 'live-streams'];
export const studentArchivesLessonTypes = ['student-review', 'question-and-answer', 'student-focus','student-collaborations'];
export const tutorialsLessonTypes = ['song-tutorial'];
export const transcriptionsLessonTypes = ['song'];
export const playAlongLessonTypes = ['play-along'];

export const individualLessonsTypes = [
  ...singleLessonTypes,
  ...practiceAlongsLessonTypes,
  ...performancesLessonTypes,
  ...documentariesLessonTypes,
  ...liveArchivesLessonTypes,
  ...studentArchivesLessonTypes
];

export const coursesLessonTypes = ['course', 'pack','spotlight'];
export const showsLessonTypes = ['diy-drum-experiments','exploring-beats','in-rhythm',  'rhythmic-adventures-of-captain-carson','rhythms-from-another-planet','study-the-greats'];
export const collectionLessonTypes = [
    ...coursesLessonTypes,
    ...showsLessonTypes
];

export const lessonTypesMapping = {
  'single lessons': singleLessonTypes,
  'practice alongs': practiceAlongsLessonTypes,
  'live archives': liveArchivesLessonTypes,
  'performances': performancesLessonTypes,
  'student archives': studentArchivesLessonTypes,
  'documentaries': documentariesLessonTypes,
  'courses': coursesLessonTypes,
  'shows': showsLessonTypes,
  'collections': collectionLessonTypes,
  'individuals': individualLessonsTypes,
  'tutorials': tutorialsLessonTypes,
  'transcriptions': transcriptionsLessonTypes,
  'tabs': transcriptionsLessonTypes,
  'sheet music': transcriptionsLessonTypes,
  'play alongs': playAlongLessonTypes,
};


export const filterTypes = {
  lessons: [...individualLessonsTypes, ...collectionLessonTypes],
  songs: [...tutorialsLessonTypes, ...transcriptionsLessonTypes, ...playAlongLessonTypes]
}

export const recentTypes = {
  lessons: [...individualLessonsTypes],
  songs: [...tutorialsLessonTypes, ...transcriptionsLessonTypes, ...playAlongLessonTypes]
}

export let contentTypeConfig = {
  song: {
    fields: ['album', 'soundslice', 'instrumentless', `"resources": ${resourcesField}`],
    relationships: {
      artist: {
        isOneToOne: true,
      },
    },
    slug: 'songs',
  },
  'song-tutorial': {
    fields: [
      '"lesson_count": child_count',
      `"lessons": child[]->{
                "id": railcontent_id,
                title,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
                web_url_path,
            }`,
      '"instructors": instructor[]->name',
    ],
    relationships: {
      artist: {
        isOneToOne: true,
      },
    },
  },
  'song-tutorial-children': {
    fields: [`"resources": ${resourcesField}`],
  },
  challenge: {
    fields: [
      'enrollment_start_time',
      'enrollment_end_time',
      "'registration_url': '/' + brand + '/enrollment/' + slug.current",
      '"lesson_count": child_count',
      '"primary_cta_text": select(dateTime(published_on) > dateTime(now()) && dateTime(enrollment_start_time) > dateTime(now()) => "Notify Me", "Start Challenge")',
      'challenge_state',
      'challenge_state_text',
      `"description": ${descriptionField}`,
      'total_xp',
      'xp',
      '"instructors": instructor[]->name',
      '"instructor_signature": instructor[0]->signature.asset->url',
      '"header_image_url": thumbnail.asset->url',
      '"logo_image_url": logo_image_url.asset->url',
      '"award": award.asset->url',
      'award_custom_text',
      '"gold_award": gold_award.asset->url',
      '"silver_award": silver_award.asset->url',
      '"bronze_award": bronze_award.asset->url',
      'is_solo',
      `"lessons": child[]->{
                    "id": railcontent_id,
                    title,
                    "image": thumbnail.asset->url,
                    "instructors": instructor[]->name,
                    length_in_seconds,
                    difficulty_string,
                    difficulty,
                    "type": _type,
                    is_always_unlocked_for_challenge,
                    is_bonus_content_for_challenge,
                }`,
    ],
  },
  course: {
    fields: [
      '"lesson_count": child_count',
      '"instructors": instructor[]->name',
      `"description": ${descriptionField}`,
      `"resource": ${resourcesField}`,
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
    slug: 'courses',
  },
  'parent-download': {
    fields: [
      '"lesson_count": child_count',
      '"instructors": instructor[]->name',
      `"description": ${descriptionField}`,
      `"resource": ${resourcesField}`,
      'xp',
      'total_xp',
      '"thumbnail_url":thumbnail.asset->url',
      `"lessons": child[]->{
                "id": railcontent_id,
                title,
                published_on,
                "type":_type,
                "image": thumbnail.asset->url,
                "instructors": instructor[]->name,
                length_in_seconds,
                "resources": ${resourcesField},
                difficulty, 
                difficulty_string,
                artist->,
                "thumbnail_url":thumbnail.asset->url,
                "description": description[0].children[0].text,
                "chapters": chapter[]{
                    chapter_description,
                    chapter_timecode,
                    "chapter_thumbnail_url": chapter_thumbnail_url.asset->url
                },
                "instructors":instructor[]->name,
                "instructor": instructor[]->{
                    "id":railcontent_id,
                    name,
                    short_bio,
                    "biography": short_bio[0].children[0].text,
                    web_url_path,
                    "coach_card_image": coach_card_image.asset->url,
                    "coach_profile_image":thumbnail_url.asset->url
                },
                ${assignmentsField}
                video,
                parent_content_data,
            }`,
    ],
  },
  method: {
    fields: [
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
      'xp',
    ],
  },
  'learning-path-course': {
    fields: [
      '"lesson_count": child_count',
      '"instructors": instructor[]->name',
      `"description": ${descriptionField}`,
      `"resource": ${resourcesField}`,
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
  'learning-path-level': {
    fields: [
      '"lesson_count": child_count',
      '"instructors": instructor[]->name',
      `"description": ${descriptionField}`,
      `"resource": ${resourcesField}`,
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
  workout: {
    fields: [artistOrInstructorNameAsArray()],
    slug: 'workouts',
  },
  'play-along': {
    fields: [
      '"style": genre[]->name',
      'mp3_no_drums_no_click_url',
      'mp3_yes_drums_yes_click_url',
      'mp3_no_drums_yes_click_url',
      'mp3_yes_drums_no_click_url',
      'bpm',
    ],
    slug: 'play-alongs',
  },
  pack: {
    fields: [
      '"lesson_count": coalesce(count(child[]->.child[]->), 0)',
      'xp',
      `"description": ${descriptionField}`,
      '"instructors": instructor[]->name',
      '"logo_image_url": logo_image_url.asset->url',
      'total_xp',
      `"children": child[]->{
                "description": ${descriptionField},
                "lesson_count": child_count,
                ${getFieldsForContentType()}
            }`,
      `"resources": ${resourcesField}`,
      '"thumbnail": thumbnail.asset->url',
      '"light_logo": light_mode_logo_url.asset->url',
      '"dark_logo": dark_mode_logo_url.asset->url',
      `"description": ${descriptionField}`,
    ],
  },
  rudiment: {
    fields: ['sheet_music_thumbnail_url'],
    slug: 'rudiments',
  },
  routine: {
    fields: [`"description": ${descriptionField}`, 'high_soundslice_slug', 'low_soundslice_slug'],
    slug: 'routines',
  },
  'pack-children': {
    fields: [
      'child_count',
      `"children": child[]->{
                "description": ${descriptionField},
                ${getFieldsForContentType()}
            }`,
      `"resources": ${resourcesField}`,
      '"image": logo_image_url.asset->url',
      '"thumbnail": thumbnail.asset->url',
      '"light_logo": light_mode_logo_url.asset->url',
      '"dark_logo": dark_mode_logo_url.asset->url',
      `"description": ${descriptionField}`,
      'total_xp',
    ],
  },
  'pack-bundle-lesson': {
    fields: [`"resources": ${resourcesField}`],
  },
  foundation: {
    fields: [
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
                xp,
                web_url_path,
                "url": web_url_path,
            }`,
    ],
  },
  unit: {
    fields: [
      '"lesson_count": child_count',
      '"instructors": instructor[]->name',
      `"description": ${descriptionField}`,
      `"resource": ${resourcesField}`,
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
  instructor: {
    fields: [
      '"coach_top_banner_image": coach_top_banner_image.asset->url',
      '"coach_bottom_banner_image": coach_bottom_banner_image.asset->url',
      '"coach_card_image": coach_card_image.asset->url',
      '"coach_featured_image": coach_featured_image.asset->url',
      '"coach_top_banner_image": coach_top_banner_image.asset->url',
      '"focus": focus[]->name',
      'focus_text',
      'forum_thread_id',
      '"long_bio": long_bio[0].children[0].text',
      'name',
      '"short_bio" : short_bio[0].children[0].text',
      'bands',
      'endorsements',
    ],
  },
  // content with just the added 'instructors' Field
  'student-focus': contentWithInstructorsField,
  'quick-tips': contentWithInstructorsField,
  'drum-fest-international-2022': contentWithInstructorsField,
  spotlight: contentWithInstructorsField,
  'the-history-of-electronic-drums': contentWithInstructorsField,
  'backstage-secret': contentWithInstructorsField,
  'question-and-answer': contentWithInstructorsField,
  'student-collaboration': contentWithInstructorsField,
  live: { ...contentWithInstructorsField, slug: 'live-streams' },
  solo: { ...contentWithInstructorsField, slug: 'solos' },
  'boot-camp': contentWithInstructorsField,
  'gear-guids': contentWithInstructorsField,
  performance: contentWithInstructorsField,
  challenges: contentWithInstructorsField,
  'on-the-road': contentWithInstructorsField,
  // content with just the added 'sort' field
  podcast: contentWithSortField,
  'in-rhythm': contentWithSortField,
  'diy-drum-experiment': contentWithSortField,
  'rhythmic-adventures-of-captain-carson': contentWithSortField,
  'study-the-greats': contentWithSortField,
  'rhythms-from-another-planet': contentWithSortField,
  'paiste-cymbals': contentWithInstructorsField,
  'behind-the-scenes': contentWithSortField,
  'exploring-beats': contentWithSortField,
  sonor: contentWithSortField,
}

export const plusMembershipPermissions = 92

export function getNewReleasesTypes(brand) {
  const baseNewTypes = [
    'student-review',
    'student-review',
    'student-focus',
    'coach-stream',
    'live',
    'question-and-answer',
    'boot-camps',
    'quick-tips',
    'workout',
    'challenge',
    'challenge-part',
    'podcasts',
    'pack',
    'song',
    'learning-path-level',
    'play-along',
    'course',
    'unit',
  ]
  switch (brand) {
    case 'drumeo':
      return [
        ...baseNewTypes,
        'drum-fest-international-2022',
        'spotlight',
        'the-history-of-electronic-drums',
        'backstage-secrets',
        'student-collaborations',
        'live',
        'solos',
        'gear-guides',
        'performances',
        'in-rhythm',
        'challenges',
        'on-the-road',
        'diy-drum-experiments',
        'rhythmic-adventures-of-captain-carson',
        'study-the-greats',
        'rhythms-from-another-planet',
        'tama-drums',
        'paiste-cymbals',
        'behind-the-scenes',
        'exploring-beats',
        'sonor',
      ]
    case 'guitareo':
      return [...baseNewTypes, 'archives', 'recording', 'chords-and-scales']
    case 'pianote':
    case 'singeo':
    default:
      return baseNewTypes
  }
}

export function getUpcomingEventsTypes(brand) {
  const baseLiveTypes = [
    'student-review',
    'student-review',
    'student-focus',
    'coach-stream',
    'live',
    'question-and-answer',
    'boot-camps',
    'quick-tips',
    'recording',
    'pack-bundle-lesson',
  ]
  switch (brand) {
    case 'drumeo':
      return [
        ...baseLiveTypes,
        'drum-fest-international-2022',
        'spotlight',
        'the-history-of-electronic-drums',
        'backstage-secrets',
        'student-collaborations',
        'live',
        'podcasts',
        'solos',
        'gear-guides',
        'performances',
        'in-rhythm',
        'challenges',
        'on-the-road',
        'diy-drum-experiments',
        'rhythmic-adventures-of-captain-carson',
        'study-the-greats',
        'rhythms-from-another-planet',
        'tama-drums',
        'paiste-cymbals',
        'behind-the-scenes',
        'exploring-beats',
        'sonor',
      ]
    case 'guitareo':
      return [...baseLiveTypes, 'archives']
    case 'pianote':
    case 'singeo':
    default:
      return baseLiveTypes
  }
}

export function artistOrInstructorName(key = 'artist_name') {
  return `'${key}': coalesce(artist->name, instructor[0]->name)`
}

export function artistOrInstructorNameAsArray(key = 'artists') {
  return `'${key}': select(artist->name != null => [artist->name], instructor[]->name)`
}

export function getFieldsForContentType(contentType, asQueryString = true) {
  const fields = contentType
    ? DEFAULT_FIELDS.concat(contentTypeConfig?.[contentType]?.fields ?? [])
    : DEFAULT_FIELDS
  return asQueryString ? fields.toString() + ',' : fields
}

export function getChildFieldsForContentType(contentType, asQueryString = true) {
  const fields = contentType
    ? DEFAULT_CHILD_FIELDS.concat(childContentTypeConfig?.[contentType] ?? [])
    : DEFAULT_CHILD_FIELDS
  return asQueryString ? fields.toString() + ',' : fields
}

/**
 * Takes the included fields array and returns a string that can be used in a groq query.
 * @param {Array<string>} filters - An array of strings that represent applied filters. This should be in the format of a key,value array. eg. ['difficulty,Intermediate',
 *     'genre,rock']
 * @returns {string} - A string that can be used in a groq query
 */
export function filtersToGroq(filters, selectedFilters = [], pageName = '') {
  if (!filters) {
    filters = []
  }

  //Account for multiple railcontent id's
  let multipleIdFilters = ''
  filters.forEach((item) => {
    if (item.includes('railcontent_id in')) {
      filters.pop(item)
      multipleIdFilters += ` && ${item} `
    }
  })

  //Group All Other filters
  const groupedFilters = groupFilters(filters)

  //Format groupFilter itemsss
  const filterClauses = Object.entries(groupedFilters)
    .map(([key, values]) => {
      if (!key || values.length === 0) return ''
      if (key.startsWith('is_')) {
        return `&& ${key} == true`
      }
      // Filter out values that exist in selectedFilters
      const joinedValues = values
        .map((value) => {
          if (key === 'bpm' && !selectedFilters.includes('bpm')) {
            if (value.includes('-')) {
              const [min, max] = value.split('-').map(Number)
              return `(bpm > ${min} && bpm < ${max})`
            } else if (value.includes('+')) {
              const min = parseInt(value, 10)
              return `(bpm > ${min})`
            } else {
              return `bpm == ${value}`
            }
          } else if (
            ['creativity', 'essential', 'focus', 'genre', 'lifestyle', 'theory', 'topic'].includes(
              key
            ) &&
            !selectedFilters.includes(key)
          ) {
            return `"${value}" in ${key}[]->name`
          } else if (
              ['style'].includes(
                  key
              ) &&
              !selectedFilters.includes(key)
          ) {
            return `"${value}" in genre[]->name`
          } else if (key === 'gear' && !selectedFilters.includes('gear')) {
            return `gear match "${value}"`
          } else if (key === 'instrumentless' && !selectedFilters.includes(key)) {
            if (value === 'Full Song Only') {
              return `(!instrumentless || instrumentless == null)`
            } else if (value === 'Instrument Removed') {
              return `instrumentless`
            } else {
              return `instrumentless == ${value}`
            }
          } else if (key === 'difficulty' && !selectedFilters.includes(key)) {
            if(value === 'Introductory'){
              return `(difficulty_string == "Novice" || difficulty_string == "Introductory" )`
            }
            return `difficulty_string == "${value}"`
          } else if (key === 'tab' && !selectedFilters.includes(key)) {
            if(value.toLowerCase() === Tabs.Individuals.name.toLowerCase()){
              const conditions = individualLessonsTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              return ` (${conditions})`;
            } else if(value.toLowerCase() === Tabs.Collections.name.toLowerCase()){
              const conditions = collectionLessonTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              return ` (${conditions})`;
            } else if(value.toLowerCase() === Tabs.Tutorials.name.toLowerCase()){
              const conditions = tutorialsLessonTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              return ` (${conditions})`;
            } else if(value.toLowerCase() === Tabs.Transcriptions.name.toLowerCase()){
              const conditions = transcriptionsLessonTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              return ` (${conditions})`;
            } else if(value.toLowerCase() === Tabs.PlayAlongs.name.toLowerCase()){
              const conditions = playAlongLessonTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              return ` (${conditions})`;
            } else if(value.toLowerCase() === Tabs.ExploreAll.name.toLowerCase()){
              var allLessons = filterTypes[pageName] || [];
              const conditions = allLessons.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              if (conditions === "") return '';
              return ` (${conditions})`;
          }else if(value.toLowerCase() === Tabs.RecentAll.name.toLowerCase()){
              var allLessons = recentTypes[pageName] || [];
              const conditions = allLessons.map(lessonType => `_type == '${lessonType}'`).join(' || ');
              if (conditions === "") return '';
              return ` (${conditions})`;
            }
            return `_type == "${value}"`
          } else if (key === 'type' && !selectedFilters.includes(key)) {
            const typeKey = value.toLowerCase();
            const lessonTypes = lessonTypesMapping[typeKey];
            if (lessonTypes) {
              const conditions = lessonTypes.map(
                  (lessonType) => `_type == '${lessonType}'`
              ).join(' || ');
              return ` (${conditions})`;
            }
            return `_type == "${value}"`;
          } else if (key === 'length_in_seconds') {
            if (value.includes('-')) {
              const [min, max] = value.split('-').map(Number)
              return `(${key} > ${min} && ${key} < ${max})`
            } else if (value.includes('+')) {
              const min = parseInt(value, 10)
              return `(${key} > ${min})`
            } else {
              return `${key} == ${value}`
            }
          } else if (key === 'pageName') {
            return ` `
          } else if (!selectedFilters.includes(key)) {
            return ` ${key} == ${/^\d+$/.test(value) ? value : `"$${value}"`}`
          }
        })
        .filter(Boolean)
        .join(' || ')

      // Return the constructed filter clause
      return joinedValues.length > 0 ? `&& (${joinedValues})` : ''
    })
    .filter(Boolean)
    .join(' ')

  //Return
  return `${multipleIdFilters} ${filterClauses}`
}

function groupFilters(filters) {
  if (filters.length === 0) return {}

  return filters.reduce((acc, filter) => {
    const [category, value] = filter.split(',')
    if (!acc[category]) acc[category] = []
    acc[category].push(value)
    return acc
  }, {})
}
