//import {AWSUrl, CloudFrontURl} from "./services/config";
import {Tabs} from "./contentMetaData.js";
import {FilterBuilder} from "./filterBuilder.js";

export const AWSUrl = 'https://s3.us-east-1.amazonaws.com/musora-web-platform'
export const CloudFrontURl = 'https://d3fzm1tzeyr5n3.cloudfront.net'

export const SONG_TYPES = ['song', 'play-along', 'jam-track', 'song-tutorial-children']
// Single hierarchy refers to only one element in the hierarchy has video lessons, not that they have a single parent
export const SINGLE_PARENT_TYPES = ['course-part', 'pack-bundle-lesson', 'song-tutorial-children']

export const artistField = `select(
          defined(artist) => artist->{ 'name': name, 'thumbnail': thumbnail_url.asset->url},
          defined(parent_content_data) => *[_type == ^.parent_content_data[0].type && railcontent_id == ^.parent_content_data[0].id][0].artist->{ 'name': name, 'thumbnail': thumbnail_url.asset->url}
        )`

export const DEFAULT_FIELDS = [
  "'sanity_id' : _id",
  "'id': railcontent_id",
  artistOrInstructorName(),
  `'artist': ${artistField}`,
  'title',
  "'image': thumbnail.asset->url",
  "'thumbnail': thumbnail.asset->url",
  'difficulty',
  'difficulty_string',
  'published_on',
  "'type': _type",
  "'length_in_seconds' : coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)",
  'brand',
  "'genre': genre[]->name",
  'status',
  "'slug' : slug.current",
  "'permission_id': permission[]->railcontent_id",
  'child_count',
  '"parent_id": parent_content_data[0].id',
]

// these are identical... why
export const DEFAULT_CHILD_FIELDS = [
  "'sanity_id' : _id",
  "'id': railcontent_id",
  artistOrInstructorName(),
  `'artist': ${artistField}`,
  'title',
  "'image': thumbnail.asset->url",
  "'thumbnail': thumbnail.asset->url",
  'difficulty',
  'difficulty_string',
  'published_on',
  "'type': _type",
  "'length_in_seconds' : coalesce(length_in_seconds, soundslice[0].soundslice_length_in_second)",
  'brand',
  "'genre': genre[]->name",
  'status',
  "'slug' : slug.current",
  "'permission_id': permission[]->railcontent_id",
  'child_count',
  '"parent_id": parent_content_data[0].id',
]

export const playAlongMp3sField = `{
      'mp3_no_drums_no_click_url':      mp3_no_drums_no_click_url,
      'mp3_no_drums_yes_click_url':     mp3_no_drums_yes_click_url,
      'mp3_yes_drums_no_click_url':     mp3_yes_drums_no_click_url,
      'mp3_yes_drums_yes_click_url':    mp3_yes_drums_yes_click_url,
}
`

export const instructorField = `instructor[]->{
            "id": railcontent_id,
            name,
            short_bio,
            "biography": short_bio[0].children[0].text,
            "coach_card_image": coach_card_image.asset->url,
            "coach_profile_image": thumbnail_url.asset->url
          }`

export const chapterField = `chapter[]{
                    chapter_description,
                    chapter_timecode,
                    "chapter_thumbnail_url": chapter_thumbnail_url.asset->url
                }`

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
  playbass: ['student-review', 'question-and-answer'],
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
export const liveArchivesLessonTypes = ['podcast', 'coach-stream', 'question-and-answer', 'live-streams', 'live'];
export const studentArchivesLessonTypes = ['student-review', 'student-focus','student-collaboration'];
export const tutorialsLessonTypes = ['song-tutorial'];
export const transcriptionsLessonTypes = ['song'];
export const playAlongLessonTypes = ['play-along'];
export const jamTrackLessonTypes = ['jam-track'];

export const individualLessonsTypes = [
  ...singleLessonTypes,
  ...practiceAlongsLessonTypes,
  ...performancesLessonTypes,
  ...documentariesLessonTypes,
  ...liveArchivesLessonTypes,
  ...studentArchivesLessonTypes
];

export const coursesLessonTypes = ['course', 'pack','spotlight', 'guided-course'];
export const showsLessonTypes = ['diy-drum-experiment','exploring-beats','in-rhythm',  'rhythmic-adventures-of-captain-carson','rhythms-from-another-planet','study-the-greats'];
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
  'play-alongs': playAlongLessonTypes,
  'jam tracks': jamTrackLessonTypes,
};

export const getNextLessonLessonParentTypes = ['course', 'guided-course', 'pack', 'pack-bundle', 'song-tutorial'];

export const progressTypesMapping = {
  'lesson': [...singleLessonTypes,...practiceAlongsLessonTypes, ...liveArchivesLessonTypes, ...performancesLessonTypes, ...studentArchivesLessonTypes, ...documentariesLessonTypes, 'live', 'pack-bundle-lesson'],
  'course': ['course'],
  'show': showsLessonTypes,
  'song tutorial': [...tutorialsLessonTypes, 'song-tutorial-children'],
  'songs': transcriptionsLessonTypes,
  'play along': playAlongLessonTypes,
  'guided course': ['guided-course'],
  'pack': ['pack', 'semester-pack'],
  'method': ['method-card', 'method-intro', 'learning-path'], //learning path might have to be seperate?
  'jam track': jamTrackLessonTypes,
  'course video': ['course-part'],
};

export const songs = {
  drumeo: 'transcription',
  guitareo: 'tab',
  pianote: 'sheet music',
  singeo: 'sheet music',
  playbass: 'tab',
}

export const filterTypes = {
  lessons: [...individualLessonsTypes, ...collectionLessonTypes],
  songs: [...tutorialsLessonTypes, ...transcriptionsLessonTypes, ...playAlongLessonTypes, ...jamTrackLessonTypes],
}

export const recentTypes = {
  lessons: [...individualLessonsTypes, 'course-part', 'pack-bundle-lesson', 'guided-course-part', 'quick-tips'],
  songs: [...SONG_TYPES],
  home: [...individualLessonsTypes, ...tutorialsLessonTypes, ...transcriptionsLessonTypes, ...playAlongLessonTypes,
  'guided-course', 'learning-path', 'live', 'course', 'pack']
}

export let contentTypeConfig = {
  'tab-data': {
    fields: [
      'enrollment_start_time',
      'enrollment_end_time',
    ],
    includeChildFields: true,
  },
  'progress-tracker': {
    fields: [
      '"parent_content_data": parent_content_data[].id',
      '"badge" : *[references(^._id) && _type == "content-award"][0].badge.asset->url',
    ],
    includeChildFields: true,
  },
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
    includeChildFields: true,
    relationships: {
      artist: {
        isOneToOne: true,
      },
    },
  },
  'song-tutorial-children': {
    fields: [`"resources": ${resourcesField}`],
  },
  'guided-course': {
    includeChildFields: true,
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
  'download': {
    fields: [
      `"resource": ${resourcesField}`,
      'soundslice',
      'instrumentless',
      `"description": ${descriptionField}`,
      `"chapters": ${chapterField}`,
      '"instructors":instructor[]->name',
      `"instructor": ${instructorField}`,
      'video',
      `"play_along_mp3s": ${playAlongMp3sField}`,
      `...select(
        defined(live_event_start_time) => {
          "live_event_start_time": live_event_start_time,
          "live_event_end_time": live_event_end_time,
          "live_event_stream_id": live_event_stream_id,
          "videoId": coalesce(live_event_stream_id, video.external_id),
          "live_event_is_global": live_global_event == true
        }
      )`

    ],
    childFields: [
      `"resource": ${resourcesField}`,
      'soundslice',
      'instrumentless',
      `"description": ${descriptionField}`,
      `"chapters": ${chapterField}`,
      '"instructors":instructor[]->name',
      `"instructor": ${instructorField}`,
      'video',
      `"play_along_mp3s": ${playAlongMp3sField}`,
      `...select(
        defined(live_event_start_time) => {
          "live_event_start_time": live_event_start_time,
          "live_event_end_time": live_event_end_time,
          "live_event_stream_id": live_event_stream_id,
          "videoId": coalesce(live_event_stream_id, video.external_id),
          "live_event_is_global": live_global_event == true
        }
      )`

    ]
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
      '"instructors": instructor[]->{ "id": railcontent_id, name, "thumbnail_url": thumbnail_url.asset->url }',
      '"logo_image_url": logo_image_url.asset->url',
      'total_xp',
      `"resources": ${resourcesField}`,
      '"thumbnail": thumbnail.asset->url',
      '"light_mode_logo": light_mode_logo_url.asset->url',
      '"dark_mode_logo": dark_mode_logo_url.asset->url',
      `"description": ${descriptionField}`,
    ],
    childFields: [
      `'description': ${descriptionField}`,
      "'lesson_count': child_count",
      `'instructors': select(
        instructor != null => instructor[]->name,
        ^.instructor[]->name
      )`,
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
      `"resources": ${resourcesField}`,
      '"image": logo_image_url.asset->url',
      '"thumbnail": thumbnail.asset->url',
      '"light_mode_logo": light_mode_logo_url.asset->url',
      '"dark_mode_logo": dark_mode_logo_url.asset->url',
      `"description": ${descriptionField}`,
      'total_xp',
    ],
    childFields: [
      `"description": ${descriptionField}`,
    ]
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
  returning: {
    fields: [
      `quarter_published`,
      '"thumbnail": thumbnail.asset->url',
    ]
  },
  leaving: {
    fields: [
      `quarter_removed`,
      '"thumbnail": thumbnail.asset->url',
    ]
  },
  "method-v2": [
    `"id":_id`,
    `"type":_type`,
    "brand",
    `"intro_video": intro_video->{ ${getIntroVideoFields().join(", ")} }`,
    `child[]->{
      "resource": ${resourcesField},
      total_skills,
      "difficulty":difficulty,
      "published_on":published_on,
      "type":_type,
      brand,
      title,
      "description": ${descriptionField},
      "thumbnail": thumbnail.asset->url,
      length_in_seconds,
      "intro_video": intro_video->{
        external_id,
        hlsManifestUrl,
        video_playback_endpoints
      },
      lp_lessons[]->{
        ${DEFAULT_FIELDS.join(',')}
      }
    }`,
  ],
  "method-v2-intro-video": getIntroVideoFields(),
}

export function getIntroVideoFields() {
  return [
    "brand",
    `"description": ${descriptionField}`,
    `"thumbnail": thumbnail.asset->url`,
    "length_in_seconds",
    `video_desktop {
      external_id,
      hlsManifestUrl,
      video_playback_endpoints
    }`,
    `video_mobile {
      external_id,
      hlsManifestUrl,
      video_playback_endpoints
    }`
  ];
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
    case 'playbass':
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

export async function getFieldsForContentTypeWithFilteredChildren(contentType, asQueryString = true) {
  const childFields = getChildFieldsForContentType(contentType, true)
  const parentFields = getFieldsForContentType(contentType, false)
  if (childFields) {
    const childFilter = await new FilterBuilder('', {isChildrenFilter: true}).buildFilter()
    parentFields.push(
      `"children": child[${childFilter}]->{
        ${childFields}
        "children": child[${childFilter}]->{
          ${childFields}
        },
      }`
    )
  }
  return asQueryString ? parentFields.toString() + ',' : parentFields
}

export function getChildFieldsForContentType(contentType, asQueryString = true)
{
  if (contentTypeConfig[contentType]?.childFields || contentTypeConfig[contentType]?.includeChildFields) {
    const childFields = contentType
      ? DEFAULT_CHILD_FIELDS.concat(contentTypeConfig?.[contentType]?.childFields ?? [])
      : DEFAULT_CHILD_FIELDS
    return asQueryString ? childFields.toString() + ',' : childFields
  } else {
    return asQueryString ? '' : []
  }
}

export function getFieldsForContentType(contentType, asQueryString = true) {
  const fields = contentType
    ? DEFAULT_FIELDS.concat(contentTypeConfig?.[contentType]?.fields ?? [])
    : DEFAULT_FIELDS
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
            } else if(value.toLowerCase() === Tabs.JamTracks.name.toLowerCase()){
              const conditions = jamTrackLessonTypes.map(lessonType => `_type == '${lessonType}'`).join(' || ');
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
