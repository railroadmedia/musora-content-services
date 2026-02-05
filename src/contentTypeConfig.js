//import {AWSUrl, CloudFrontURl} from "./services/config";
import { LengthFilterOptions, Tabs } from './contentMetaData.js'
import { FilterBuilder } from './filterBuilder.js'

export const AWSUrl = 'https://s3.us-east-1.amazonaws.com/musora-web-platform'
export const CloudFrontURl = 'https://d3fzm1tzeyr5n3.cloudfront.net'

// This is used to pull related content by license, so we only show "consumable" content
export const SONG_TYPES = ['song', 'play-along', 'jam-track', 'song-tutorial-lesson']
// Oct 2025: It turns out content-meta categories are not really clear
// THis is used for the page_type field as a post processor so we include parents and children
// Duplicated in SanityGateway.php if you update this, update that
export const SONG_TYPES_WITH_CHILDREN = [
  'song',
  'play-along',
  'jam-track',
  'song-tutorial',
  'song-tutorial-lesson',
]
// Single hierarchy refers to only one element in the hierarchy has video lessons, not that they have a single parent
export const SINGLE_PARENT_TYPES = ['course-lesson', 'pack-bundle-lesson', 'song-tutorial-lesson']

export const LEARNING_PATH_LESSON = 'learning-path-lesson-v2'

export const genreField = `genre[]->{
  name,
  'slug': slug.current,
  'thumbnail': thumbnail_url.asset->url,
}`

export const instructorField = `instructor[]->{
  name,
  'slug': slug.current,
  short_bio,
  'thumbnail': thumbnail_url.asset->url,
  "biography": short_bio[0].children[0].text,
  "coach_card_image": coach_card_image.asset->url,
  "coach_profile_image": thumbnail_url.asset->url
}`

export const artistField = `select(
          defined(artist) => artist->{ 'name': name, 'slug': slug.current, 'thumbnail': thumbnail_url.asset->url},
          defined(parent_content_data) => *[_type == ^.parent_content_data[0].type && railcontent_id == ^.parent_content_data[0].id][0].artist->{ 'name': name, 'slug': slug.current, 'thumbnail': thumbnail_url.asset->url}
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
  `"instructor": ${instructorField}`,
  `'genre': ${genreField}`,
  'status',
  "'slug' : slug.current",
  "'permission_id': permission_v2",
  'child_count',
  '"parent_id": parent_content_data[0].id',
  '"grandparent_id": parent_content_data[1].id',
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
  `'genre': ${genreField}`,
  'status',
  "'slug' : slug.current",
  "'permission_id': permission_v2",
  'child_count',
  '"parent_id": parent_content_data[0].id',
  '"grandparent_id": parent_content_data[1].id',
]

export const playAlongMp3sField = `{
      'mp3_no_drums_no_click_url':      mp3_no_drums_no_click_url,
      'mp3_no_drums_yes_click_url':     mp3_no_drums_yes_click_url,
      'mp3_yes_drums_no_click_url':     mp3_yes_drums_no_click_url,
      'mp3_yes_drums_yes_click_url':    mp3_yes_drums_yes_click_url,
}
`

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

export const contentAwardField = "*[references(^._id) && _type == 'content-award'][0]"

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

// todo: refactor live event queries to use this
export const liveFields = `
    'slug': slug.current,
    'id': railcontent_id,
    title,
    live_event_start_time,
    live_event_end_time,
    live_event_stream_id,
    "live_event_is_global": live_global_event == true,
    published_on,
    "thumbnail": thumbnail.asset->url,
    ${artistOrInstructorName()},
    difficulty_string,
    railcontent_id,
    "instructors": ${instructorField},
    'videoId': coalesce(live_event_stream_id, video.external_id)
  `

const contentWithInstructorsField = {
  fields: ['"instructors": instructor[]->name'],
}

const contentWithSortField = {
  fields: ['sort'],
}
export const showsTypes = {
  drumeo: [
    'odd-times',
    'spotlight',
    'quick-tips',
    'question-and-answer',
    'live',
    'podcast',
    'boot-camp',
    'gear-guide',
    'performance',
    'study-the-greats',
  ],
  pianote: ['student-review', 'question-and-answer'],
  guitareo: ['student-review', 'question-and-answer', 'archives', 'recording'],
  singeo: ['student-review', 'question-and-answer'],
  playbass: ['student-review', 'question-and-answer'],
}

export const coachLessonsTypes = [
  'course-collection',
  'course',
  'course-lesson',
  'coach-stream',
  'student-focus',
  'quick-tips',
  'question-and-answer',
  'song-tutorial',
  'song-tutorial-lesson',
  'workout',
]

export const childContentTypeConfig = {
  'song-tutorial': [`"genre": ${genreField}`, `difficulty_string`, `"type": _type`],
}

export const singleLessonTypes = ['quick-tips', 'rudiment']
export const practiceAlongsLessonTypes = ['workout']
export const performancesLessonTypes = ['performance']
export const liveArchivesLessonTypes = [
  'podcast',
  'coach-stream',
  'question-and-answer',
  'live-streams',
  'live',
]
export const studentArchivesLessonTypes = [
  'student-review',
  'student-focus',
  'student-collaboration',
]
export const tutorialsLessonTypes = ['song-tutorial']
export const transcriptionsLessonTypes = ['song']
export const playAlongLessonTypes = ['play-along']
export const jamTrackLessonTypes = ['jam-track']

export const individualLessonsTypes = [
  ...singleLessonTypes,
  ...practiceAlongsLessonTypes,
  ...liveArchivesLessonTypes,
  ...studentArchivesLessonTypes,
]

export const coursesLessonTypes = [
  'course',
  'course-collection',
  'guided-course',
]

export const skillLessonTypes = ['skill-pack']

export const showsLessonTypes = [
  'boot-camp',
  'study-the-greats',
  'gear-guide',
  'odd-times',
  'podcast',
  'spotlight',
  'performance',
]
export const entertainmentLessonTypes = ['special', 'documentary-lesson', ...showsLessonTypes]
export const collectionLessonTypes = [...coursesLessonTypes]

export const lessonTypesMapping = {
  lessons: singleLessonTypes,
  'practice alongs': [ ...practiceAlongsLessonTypes, 'routine'],
  'live archives': liveArchivesLessonTypes,
  performances: performancesLessonTypes,
  'student archives': studentArchivesLessonTypes,
  documentaries: ['documentary-lesson'],
  courses: ['course'],
  'guided courses': ['guided-course'],
  'course collections': ['course-collection'],
  'skill packs': ['skill-pack'],
  specials: ['special'],
  shows: showsLessonTypes,
  collections: collectionLessonTypes,
  individuals: individualLessonsTypes,
  tutorials: tutorialsLessonTypes,
  transcriptions: transcriptionsLessonTypes,
  tabs: transcriptionsLessonTypes,
  'sheet music': transcriptionsLessonTypes,
  'play-alongs': playAlongLessonTypes,
  'jam tracks': jamTrackLessonTypes,
  entertainment: entertainmentLessonTypes,
  'single lessons': [
    ...singleLessonTypes,
    ...liveArchivesLessonTypes,
    ...studentArchivesLessonTypes,
    ...practiceAlongsLessonTypes,
  ],
  routines: ['routine']
}

export const getNextLessonLessonParentTypes = [
  'course',
  'guided-course',
  'course-collection',
  'song-tutorial',
  'learning-path-v2',
  'skill-pack',
]

export const progressTypesMapping = {
  lesson: [
    ...singleLessonTypes,
    ...practiceAlongsLessonTypes,
    ...liveArchivesLessonTypes,
    ...performancesLessonTypes,
    ...studentArchivesLessonTypes,
    'documentary-lesson',
    'live',
    'course-lesson',
    'routine'
  ],
  course: ['course'],
  show: showsLessonTypes,
  'song tutorial': [...tutorialsLessonTypes, 'song-tutorial-lesson'],
  songs: transcriptionsLessonTypes,
  'play along': playAlongLessonTypes,
  'guided course': ['guided-course', 'guided-course-lesson'],
  'course collection': ['course-collection'],
  'learning path': ['learning-path-v2'],
  'skill pack': [...skillLessonTypes, 'skill-pack-lesson'],
  'jam track': jamTrackLessonTypes,
  'course video': ['course-lesson'],
}

export const songs = {
  drumeo: 'transcription',
  guitareo: 'tab',
  pianote: 'sheet music',
  singeo: 'sheet music',
  playbass: 'tab',
}

export const filterTypes = {
  lessons: [
    ...singleLessonTypes,
    ...practiceAlongsLessonTypes,
    ...liveArchivesLessonTypes,
    ...studentArchivesLessonTypes,
    ...coursesLessonTypes,
    ...skillLessonTypes,
    ...entertainmentLessonTypes,
    'routine'
  ],
  songs: [
    ...tutorialsLessonTypes,
    ...transcriptionsLessonTypes,
    ...playAlongLessonTypes,
    ...jamTrackLessonTypes,
  ],
}

export const recentTypes = {
  lessons: [
    ...individualLessonsTypes,
    ...skillLessonTypes,
    ...entertainmentLessonTypes,
    'course-lesson',
    'guided-course-lesson',
    'quick-tips',
    'routine'
  ],
  songs: [...SONG_TYPES],
  home: [
    ...skillLessonTypes,
    ...individualLessonsTypes,
    ...tutorialsLessonTypes,
    ...skillLessonTypes,
    ...transcriptionsLessonTypes,
    ...playAlongLessonTypes,
    ...showsLessonTypes,
    'guided-course',
    'learning-path-v2',
    'live',
    'course',
    'course-collection',
    'routine'
  ],
}

export const ownedContentTypes = {
  lessons: [
    ...singleLessonTypes,
    ...practiceAlongsLessonTypes,
    ...liveArchivesLessonTypes,
    ...studentArchivesLessonTypes,
    ...coursesLessonTypes,
    ...skillLessonTypes,
    ...entertainmentLessonTypes,
  ],
  songs: [
    ...tutorialsLessonTypes,
    ...transcriptionsLessonTypes,
    ...playAlongLessonTypes,
    ...jamTrackLessonTypes,
  ],
}

export let contentTypeConfig = {
  'tab-data': {
    fields: ['enrollment_start_time', 'enrollment_end_time'],
    includeChildFields: true,
  },
  'progress-tracker': {
    fields: [
      '"parent_content_data": parent_content_data[].id',
      `"badge" : ${contentAwardField}.badge.asset->url`,
      `"badge_rear" : ${contentAwardField}.badge_rear.asset->url`,
      `"badge_logo" : ${contentAwardField}.logo.asset->url`,
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
      `"children": child[]->{
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
  'song-tutorial-lesson': {
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
  'course-lesson': {
    fields: [`"resources": ${resourcesField}`],
  },
  download: {
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
      )`,
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
      )`,
    ],
  },
  'learning-path-v2': {
    fields: [
      `"intro_video": intro_video->{ ${getIntroVideoFields('learning-path-v2').join(', ')} }`,
      'total_skills',
      `"resource": ${resourcesField}`,
    ],
    includeChildFields: true,
    childFields: [
      `"parent_data": parent_content_data[0] {
        "id": id,
        "title": *[railcontent_id == ^.id][0].title,
    }`,
    ],
  },
  workout: {
    fields: [artistOrInstructorNameAsArray()],
    slug: 'workouts',
  },
  'play-along': {
    fields: [
      `"style": ${genreField}`,
      'mp3_no_drums_no_click_url',
      'mp3_yes_drums_yes_click_url',
      'mp3_no_drums_yes_click_url',
      'mp3_yes_drums_no_click_url',
      'bpm',
    ],
    slug: 'play-alongs',
  },
  'course-collection': {
    fields: [
      '"lesson_count": coalesce(count(child[]->.child[]->), 0)',
      `"description": ${descriptionField}`,
      '"instructors": instructor[]->{ "id": railcontent_id, name, "thumbnail_url": thumbnail_url.asset->url }',
      '"logo_image_url": logo_image_url.asset->url',
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
    fields: [`"description": ${descriptionField}`, 'soundslice_slug'],
    slug: 'routines',
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
  spotlight: contentWithInstructorsField,
  'question-and-answer': contentWithInstructorsField,
  'student-collaboration': contentWithInstructorsField,
  live: { ...contentWithInstructorsField, slug: 'live-streams' },
  'boot-camp': contentWithInstructorsField,
  'gear-guide': contentWithInstructorsField,
  performance: contentWithInstructorsField,
  // content with just the added 'sort' field
  podcast: contentWithSortField,
  'study-the-greats': contentWithSortField,
  returning: {
    fields: [`quarter_published`, '"thumbnail": thumbnail.asset->url'],
  },
  leaving: {
    fields: [`quarter_removed`, '"thumbnail": thumbnail.asset->url'],
  },
  'method-v2': [
    `"id":_id`,
    `"type":_type`,
    'title',
    'brand',
    `"intro_video": intro_video->{ ${getIntroVideoFields('method-v2').join(', ')} }`,
    `child[]->{
      "resource": ${resourcesField},
      total_skills,
      difficulty,
      published_on,
      "type":_type,
      brand,
      title,
      "description": ${descriptionField},
      "thumbnail": thumbnail.asset->url,
      length_in_seconds,
      intro_video,
      child[]->{
        ${DEFAULT_FIELDS.join(',')}
      }
    }`,
  ],
}

export function getIntroVideoFields(type) {
  const fields = [
    `"id": railcontent_id`,
    'title',
    'brand',
    `"instructor": ${instructorField}`,
    `difficulty`,
    `difficulty_string`,
    `"type": _type`,
    'brand',
    `"description": ${descriptionField}`,
    `"thumbnail": thumbnail.asset->url`,
    'length_in_seconds',
  ]

  if (type === 'method-v2') {
    fields.push(...['video_desktop', 'video_mobile'])
  } else if (type === 'learning-path-v2') {
    fields.push('video')
  }

  return fields
}

export const plusMembershipPermissions = 92

/**
 * Membership permission IDs for all membership tiers.
 * Used for showing membership-restricted content in upgrade prompts.
 * - 92: Plus membership
 */
export const membershipPermissions = [92]

export const plusMembershipTier = 'plus'
export const basicMembershipTier = 'basic'

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
    'course-collection',
    'song',
    'play-along',
    'course',
    'unit',
  ]
  switch (brand) {
    case 'drumeo':
      return [
        ...baseNewTypes,
        'spotlight',
        'student-collaborations',
        'live',
        'gear-guides',
        'performances',
        'study-the-greats',
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
    'student-focus',
    'coach-stream',
    'live',
    'question-and-answer',
    'boot-camp',
    'quick-tips',
    'recording',
  ]
  switch (brand) {
    case 'drumeo':
      return [
        ...baseLiveTypes,
        'spotlight',
        'student-collaborations',
        'live',
        'podcast',
        'gear-guide',
        'performance',
        'study-the-greats',
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

export async function getFieldsForContentTypeWithFilteredChildren(
  contentType,
  asQueryString = true
) {
  const childFields = getChildFieldsForContentType(contentType, true)
  const parentFields = getFieldsForContentType(contentType, false)
  if (childFields) {
    const childFilter = await new FilterBuilder('', {
      isChildrenFilter: true,
      showMembershipRestrictedContent: true, // Show all children in lists
    }).buildFilter()
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

export function getChildFieldsForContentType(contentType, asQueryString = true) {
  // When contentType is undefined/null, return DEFAULT_CHILD_FIELDS to support mixed-type queries (e.g., from Algolia)
  if (!contentType) {
    return asQueryString ? DEFAULT_CHILD_FIELDS.toString() + ',' : DEFAULT_CHILD_FIELDS
  }

  if (
    contentTypeConfig[contentType]?.childFields ||
    contentTypeConfig[contentType]?.includeChildFields
  ) {
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
    : DEFAULT_FIELDS.slice() // ensure copy, not original reference
  return asQueryString ? fields.toString() + ',' : fields
}

/**
 * Helper function to create type conditions from content type arrays
 */
function createTypeConditions(lessonTypes) {
  if (!lessonTypes || lessonTypes.length === 0) return ''
  const conditions = lessonTypes.map((type) => `_type == '${type}'`).join(' || ')
  return conditions ? `(${conditions})` : ''
}

/**
 * Filter handler registry - maps filter keys to their handler functions
 */
const filterHandlers = {
  style: (value) => `"${value}" in genre[]->name`,

  difficulty: (value) => {
    return `difficulty_string == "${value}"`
  },

  tab: (value, pageName) => {
    const valueLower = value.toLowerCase()
    const tabMappings = {
      [Tabs.Individuals.name.toLowerCase()]: individualLessonsTypes,
      [Tabs.Collections.name.toLowerCase()]: collectionLessonTypes,
      [Tabs.Tutorials.name.toLowerCase()]: tutorialsLessonTypes,
      [Tabs.Transcriptions.name.toLowerCase()]: transcriptionsLessonTypes,
      [Tabs.PlayAlongs.name.toLowerCase()]: playAlongLessonTypes,
      [Tabs.JamTracks.name.toLowerCase()]: jamTrackLessonTypes,
      [Tabs.ExploreAll.name.toLowerCase()]: filterTypes[pageName] || [],
      [Tabs.RecentAll.name.toLowerCase()]: recentTypes[pageName] || [],
      [Tabs.SingleLessons.name.toLowerCase()]: individualLessonsTypes,
      [Tabs.Courses.name.toLowerCase()]: coursesLessonTypes,
      [Tabs.SkillPacks.name.toLowerCase()]: skillLessonTypes,
      [Tabs.Entertainment.name.toLowerCase()]: entertainmentLessonTypes,
    }

    const lessonTypes = tabMappings[valueLower]
    if (lessonTypes) {
      return createTypeConditions(lessonTypes)
    }

    return `_type == "${value}"`
  },

  type: (value) => {
    const typeKey = value.toLowerCase()
    const lessonTypes = lessonTypesMapping[typeKey]

    if (lessonTypes) {
      return createTypeConditions(lessonTypes)
    }

    return `_type == "${value}"`
  },

  length: (value) => {
    // Find the matching length option by name
    const lengthOption = Object.values(LengthFilterOptions).find(
      (opt) => typeof opt === 'object' && opt.name === value
    )

    if (!lengthOption) return ''

    const optionValue = lengthOption.value

    // Parse the value format: '<420', '420-900', '>1801'
    if (optionValue.startsWith('<')) {
      const max = parseInt(optionValue.substring(1), 10)
      return `(length_in_seconds < ${max})`
    }

    if (optionValue.startsWith('>')) {
      const min = parseInt(optionValue.substring(1), 10)
      return `(length_in_seconds > ${min})`
    }

    if (optionValue.includes('-')) {
      const [min, max] = optionValue.split('-').map(Number)
      return `(length_in_seconds >= ${min} && length_in_seconds <= ${max})`
    }

    return ''
  },

  pageName: () => '', // pageName is meta, doesn't generate a query
}

/**
 * Takes the included fields array and returns a string that can be used in the groq query.
 * @param {Array<string>} filters - An array of strings that represent applied filters.
 *                                  Format: ['difficulty,Intermediate', 'genre,rock']
 * @param {Array<string>} selectedFilters - Filters to exclude from processing
 * @param {string} pageName - Current page name for context-specific filtering
 * @returns {string} - A GROQ query filter string
 */
export function filtersToGroq(filters = [], selectedFilters = [], pageName = '') {
  // Handle railcontent_id filters separately (they use different syntax)
  const railcontentIdFilters = filters
    .filter((item) => item.includes('railcontent_id in'))
    .map((item) => ` && ${item}`)
    .join('')

  // Remove railcontent_id filters from main processing
  const regularFilters = filters.filter((item) => !item.includes('railcontent_id in'))

  // Group filters by key
  const groupedFilters = groupFilters(regularFilters)

  // Process each filter group
  const filterClauses = Object.entries(groupedFilters)
    .map(([key, values]) => {
      // Skip empty filters
      if (!key || values.length === 0) return ''

      // Handle boolean flags (is_*)
      if (key.startsWith('is_')) {
        return `&& ${key} == true`
      }

      // Skip if in selectedFilters
      if (selectedFilters.includes(key)) {
        return ''
      }

      // Process each value with the appropriate handler
      const joinedValues = values
        .map((value) => {
          const handler = filterHandlers[key]

          if (handler) {
            return handler(value, pageName)
          }

          // Default handler for unknown filters
          return `${key} == ${/^\d+$/.test(value) ? value : `"${value}"`}`
        })
        .filter(Boolean)
        .join(' || ')

      // Return the constructed filter clause
      return joinedValues.length > 0 ? `&& (${joinedValues})` : ''
    })
    .filter(Boolean)
    .join(' ')

  return `${railcontentIdFilters} ${filterClauses}`.trim()
}

/**
 * Groups filters by category
 * @param {Array<string>} filters - Array of 'key,value' strings
 * @returns {Object} - Object with keys as categories and values as arrays
 */
function groupFilters(filters) {
  if (filters.length === 0) return {}

  return filters.reduce((acc, filter) => {
    const [category, value] = filter.split(',')
    if (!acc[category]) acc[category] = []
    acc[category].push(value)
    return acc
  }, {})
}

export const getFormattedType = (type, brand) => {
  for (const [key, values] of Object.entries(progressTypesMapping)) {
    if (values.includes(type)) {
      return key === 'songs' ? songs[brand] : key
    }
  }

  return null
}

export const awardTemplate = {
  drumeo: {
    front: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/drumeo.svg",
    rear: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/drumeo-rear.svg",
  },
  guitareo: {
    front: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/guitareo.svg",
    rear: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/guitareo-rear.svg",
  },
  pianote: {
    front: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/pianote.svg",
    rear: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/pianote-rear.svg",
  },
  singeo: {
    front: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/singeo.svg",
    rear: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/singeo-rear.svg",
  },
  playbass: {
    front: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/playbass.svg",
    rear: "https://d3fzm1tzeyr5n3.cloudfront.net/v2/awards/playbass-rear.svg",
  },
  musora: {
    front: null,
    rear: null,
  },
}

/**
 * Adds award badge_template to content(s) where badge_logo exists
 * @param {object|object[]} content - sanity content(s) response
 * @param {string} brand - brand for if content brand is missing
 * @returns {object|object[]} post-processed content
 */
export function addAwardTemplateToContent(content, brand= null) {
  if (!content) return content

  // should be fine with this; children don't need awards.
  // assumes if badge_logo exists, it needs a badge_template.
  if (Array.isArray(content)) {
    content.forEach((item) => {
      if (item['badge_logo'] && !item['badge_template']) {
        item['badge_template'] = awardTemplate[item['brand'] || brand].front
        item['badge_template_rear'] = awardTemplate[item['brand'] || brand].rear
      }
    })
  } else {
    if (content['badge_logo'] && !content['badge_template']) {
      content['badge_template'] = awardTemplate[content['brand'] || brand].front
      content['badge_template_rear'] = awardTemplate[content['brand'] || brand].rear
    }
  }

  return content
}
