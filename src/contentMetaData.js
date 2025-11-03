// Metadata is taken from the 'common' element and then merged with the <brand> metadata.
// Brand values are prioritized and will override the same property in the 'common' element.

const PROGRESS_NAMES = ['All', 'In Progress', 'Completed', 'Not Started']
const DIFFICULTY_STRINGS = ['Introductory', 'Beginner', 'Intermediate', 'Advanced', 'Expert']

class SortingOptions {
  static Popularity = { value: '-popularity', name: 'Most Popular' }
  static PopularityDesc = { value: 'recommended', name: 'Recommended' }
  static PublishedOn = { value: '-published_on', name: 'Newest First' }
  static PublishedOnDesc = { value: 'published_on', name: 'Oldest First' }
  static Slug = { value: 'slug', name: 'Name: A to Z' }
  static SlugDesc = { value: '-slug', name: 'Name: Z to A' }
  static AllSortingOptions = [
      this.PopularityDesc,
    this.Popularity,
    this.PublishedOn,
    this.PublishedOnDesc,
    this.Slug,
    this.SlugDesc,
  ]
}

export class LengthFilterOptions {
  static UpTo7 = { value: '<420', name: 'Up to 7 Minutes' }
  static From7To15 = { value: '420-900', name: '7 to 15 Minutes' }
  static From15To30 = { value: '901-1800', name: '15 to 30 Minutes' }
  static More30 = { value: '>1801', name: '30+ Minutes' }
  static AllOptions = [
    this.UpTo7.name,
    this.From7To15.name,
    this.From15To30.name,
    this.More30.name,
  ]
}

export class Tabs {
  static ForYou = { name: 'For You', short_name: 'For You' }
  static Individuals = { name: 'Individuals', short_name: 'Individuals', value: 'type,individuals', cardType: 'big' }
  static Collections = { name: 'Collections', short_name: 'Collections', value: 'type,collections', cardType: 'big' }
  static ExploreAll = { name: 'Explore All', short_name: 'Explore All',  icon: 'icon-filters', cardType: 'big'}
  static All = { name: 'All', short_name: 'All', value: '' }
  static Courses = { name: 'Courses', short_name: 'Courses', value: '' }
  static SkillLevel = { name: 'Skill Level', short_name: 'SKILL LEVEL', is_group_by: true, value: 'difficulty_string' }
  static Genres = { name: 'Genres', short_name: 'Genres', is_group_by: true, value: 'genre' }
  static Completed = { name: 'Completed', short_name: 'COMPLETED', is_group_by: false, value: 'completed' }
  static InProgress = { name: 'In Progress', short_name: 'IN PROGRESS', is_group_by: false, value: 'in progress' }
  static Instructors = { name: 'Instructors', short_name: 'INSTRUCTORS', is_group_by: true, value: 'instructor' }
  static Lessons = { name: 'Lessons', short_name: 'LESSONS', value: '' }
  static Artists = { name: 'Artists', short_name: 'ARTISTS', is_group_by: true, value: 'artist' }
  static Songs = { name: 'Songs', short_name: 'Songs', value: '' }
  static Tutorials = { name: 'Tutorials', short_name: 'Tutorials', value: 'type,tutorials', cardType: 'big' }
  static Transcriptions = { name: 'Transcriptions', short_name: 'Transcriptions', value: 'type,transcription', cardType: 'small' }
  static PlayAlongs = { name: 'Play-Alongs', short_name: 'Play-Alongs', value:'type,play along', cardType: 'small' }
  static JamTracks = { name: 'Jam Tracks', short_name: 'Jam Tracks', value:'type,jam-track', cardType: 'small' }
  static RecentAll = { name: 'All', short_name: 'All' }
  static RecentIncomplete = { name: 'Incomplete', short_name: 'Incomplete' }
  static RecentCompleted = { name: 'Completed', short_name: 'Completed' }
  static RecentActivityLessons = { name: 'Lessons', short_name: 'Lessons' }
  static RecentActivitySongs = { name: 'Songs', short_name: 'Songs' }
  static RecentActivityPosts = { name: 'Posts', short_name: 'Posts' }
  static RecentActivityComments = { name: 'Comments', short_name: 'Comments' }
 // new tabs - 29.10
  static SingleLessons = { name: 'Single Lessons', short_name: 'Single Lessons' }
  static SkillPacks = { name: 'Skill Packs', short_name: 'Skill Packs' }
  static Entertainment = { name: 'Entertainment', short_name: 'Entertainment' }
}

export const TabResponseType = {
  SECTIONS: 'sections',
  CATALOG: 'catalog',
  PROGRESS_ROWS: 'progress_rows',
};

const commonMetadata = {
  'lessons': {
    name: 'Lessons',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      length: LengthFilterOptions.AllOptions,
      style: ['Country/Folk', 'Funk/Disco', 'Hard Rock/Metal', 'Hip-Hop/Rap/EDM', 'Holiday/Soundtrack', 'Jazz/Blues', 'Latin/World', 'Pop/Rock', 'R&B/Soul', 'Worship/Gospel'],
      type: ['Single Lessons', 'Practice Alongs', 'Performances', 'Courses', 'Live Archives', 'Student Archives'],
      progress: PROGRESS_NAMES,
    },
    sortingOptions: {
      title: 'Sort By',
      type: 'radio',
      items: SortingOptions.AllSortingOptions,
    },
    tabs: [
      Tabs.ForYou,
      Tabs.SingleLessons,
      Tabs.Courses,
      Tabs.SkillPacks,
      Tabs.Entertainment,
      Tabs.ExploreAll
    ],
  },
  'songs': {
    name: 'Songs',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      style: ['Blues','Christian','Classical','Country','Disco','Electronic','Folk','Funk','Hip-Hop/Rap','Holiday','Jazz','Soundtrack',
      'World','Metal','Pop','R&B/Soul','Rock'],
      type: ['Tutorials', 'Transcriptions', 'Jam Tracks'],
      progress: PROGRESS_NAMES,
    },
    sortingOptions: {
      title: 'Sort By',
      type: 'radio',
      items: SortingOptions.AllSortingOptions,
    },
    tabs: [
      Tabs.ForYou,
      Tabs.Tutorials,
      Tabs.Transcriptions,
      Tabs.PlayAlongs,
      Tabs.JamTracks,
      Tabs.ExploreAll
    ],
  },
  'recent': {
    name: 'Recent Lessons',
    tabs: [
      Tabs.RecentAll,
      Tabs.RecentIncomplete,
      Tabs.RecentCompleted
    ],
  },
  recommendation: {
    tabs: [
      { name: 'All', is_group_by: true, value: ['group_by,Recommended'] },
      { name: 'Songs', value: ['filter,song'] },
      { name: 'Lessons', value: ['filter,lesson'] },
      { name: 'Workouts', value: ['filter,workout'] },
    ],
  },
  'recent-activities': {
    name: 'Recent Activity',
    onlyAvailableTabs: true,
    tabs: [
      Tabs.RecentAll,
      Tabs.RecentActivityLessons,
      Tabs.RecentActivitySongs,
      Tabs.RecentActivityPosts,
      Tabs.RecentActivityComments,
    ],
  },
}
const contentMetadata = {
  drumeo: {
    'lessons': {
      name: 'Lessons',
      filterOptions: {
        difficulty: DIFFICULTY_STRINGS,
        length: LengthFilterOptions.AllOptions,
        style: ['Country/Folk', 'Funk/Disco', 'Hard Rock/Metal', 'Hip-Hop/Rap/EDM', 'Holiday/Soundtrack', 'Jazz/Blues', 'Latin/World', 'Pop/Rock', 'R&B/Soul', 'Worship/Gospel'],
        type: ['Single Lessons', 'Practice Alongs', 'Performances', 'Courses', 'Shows', 'Documentaries', 'Live Archives', 'Student Archives'],
        progress: PROGRESS_NAMES,
      },
      sortingOptions: {
        title: 'Sort By',
        type: 'radio',
        items: SortingOptions.AllSortingOptions,
      },
      tabs: [
        Tabs.ForYou,
        Tabs.SingleLessons,
        Tabs.Courses,
        Tabs.SkillPacks,
        Tabs.Entertainment,
        Tabs.ExploreAll
      ],
    },
    'songs-types': ['Tutorials', 'Transcriptions', 'Play-Alongs', 'Jam Tracks'],
  },
  pianote: {
    'lessons': {
      name: 'Lessons',
      filterOptions: {
        difficulty: DIFFICULTY_STRINGS,
        length: LengthFilterOptions.AllOptions,
        style: ['Classical', 'Country/Folk', 'Funk/Disco', 'Hip-Hop/Rap/EDM', 'Holiday/Soundtrack', 'Jazz/Blues', 'Latin/World', 'Pop/Rock', 'R&B/Soul', 'Worship/Gospel'],
        type: ['Single Lessons', 'Practice Alongs', 'Performances', 'Courses', 'Live Archives', 'Student Archives'],
        progress: PROGRESS_NAMES,
      },
      sortingOptions: {
        title: 'Sort By',
        type: 'radio',
        items: SortingOptions.AllSortingOptions,
      },
      tabs: [
        Tabs.ForYou,
        Tabs.SingleLessons,
        Tabs.Courses,
        Tabs.SkillPacks,
        Tabs.Entertainment,
        Tabs.ExploreAll
      ],
    },
    'songs-types': ['Tutorials', 'Sheet Music', 'Play-Alongs', 'Jam Tracks'],
  },
  guitareo: {
    'songs-types': ['Tutorials', 'Tabs', 'Play-Alongs', 'Jam Tracks'],
  },
  playbass: {
    'songs-types': ['Tutorials', 'Tabs', 'Play-Alongs', 'Jam Tracks'],
  },
  singeo: {
    'songs-types': ['Tutorials', 'Sheet Music', 'Play-Alongs', 'Jam Tracks'],
  }
}

export const typeWithSortOrder = [
  'in-rhythm',
  'diy-drum-experiments',
  'rhythmic-adventures-of-captain-carson',
]

export function processMetadata(brand, type, withFilters = false) {
  let brandMetaData = contentMetadata[brand]?.[type]
  let commonMetaData = commonMetadata[type]
  brandMetaData = { ...commonMetaData, ...brandMetaData }
  if (type === 'songs' && contentMetadata[brand]?.['songs-types']) {
    brandMetaData['filterOptions']['type'] = contentMetadata[brand]['songs-types']
  }
  if (Object.keys(brandMetaData).length === 0) {
    return null
  }
  const processedData = {
    type,
    name: brandMetaData.name || null,
    sort: brandMetaData.sortingOptions || null,
    tabs: brandMetaData.tabs || [],
  }

  if (withFilters && brandMetaData.filterOptions) {
    processedData.filters = transformFilters(brandMetaData.filterOptions)
  }

  if (withFilters && !brandMetaData.filterOptions) {
    Object.keys(brandMetaData).forEach((key) => {
      if ('name' !== key) {
        processedData[key] = brandMetaData[key]
      }
    })
  }

  return processedData
}

/**
 * Defines the filter types for each key
 */
const filterTypes = {
  difficulty: 'checkbox',
  genre: 'checkbox',
  topic: 'checkbox',
  type: 'checkbox',
  progress: 'radio',
}

/**
 * Transforms filterOptions into the required format
 */
function transformFilters(filterOptions) {
  return Object.entries(filterOptions).map(([key, values]) => ({
    title: capitalizeFirstLetter(key),
    type: filterTypes[key] || 'checkbox',
    key,
    items: values.map(value => ({
      name: value,
      value: `${key},${key === 'progress' ? value.toLowerCase() : value}`,
    })),
  }))
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
