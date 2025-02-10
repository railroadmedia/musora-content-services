// Metadata is taken from the 'common' element and then merged with the <brand> metadata.
// Brand values are prioritized and will override the same property in the 'common' element.

const PROGRESS_NAMES = ['All', 'In Progress', 'Complete', 'Not Started']
const DIFFICULTY_STRINGS = ['All', 'Introductory', 'Beginner', 'Intermediate', 'Advanced', 'Expert']

class SortingOptions {
  static Popularity = { value: '-popularity', name: 'Most Popular' }
  static PopularityDesc = { value: '-popularity', name: 'Recommended' }
  static PublishedOn = { value: '-published_on', name: 'Newest First' }
  static PublishedOnDesc = { value: 'published_on', name: 'Oldest First' }
  static Slug = { value: 'slug', name: 'Name: A to Z' }
  static SlugDesc = { value: '-slug', name: 'Name: Z to A' }
  static AllSortingOptions = [
    this.Popularity,
    this.PopularityDesc,
    this.PublishedOn,
    this.PublishedOnDesc,
    this.Slug,
    this.SlugDesc,
  ]
}

class Tabs {
  static ForYou = { name: 'For You', short_name: 'For You' }
  static Singles = { name: 'Singles', short_name: 'Singles', value: 'type,singles' }
  static Courses = { name: 'Courses', short_name: 'Courses', value: 'type,courses' }
  static All = { name: 'All', short_name: 'All', value: '' }
  static SkillLevel = { name: 'Skill Level', short_name: 'SKILL LEVEL', is_group_by: true, value: 'difficulty_string' }
  static Genres = { name: 'Genres', short_name: 'Genres', is_group_by: true, value: 'genre' }
  static Completed = { name: 'Completed', short_name: 'COMPLETED', is_group_by: false, value: 'completed' }
  static InProgress = { name: 'In Progress', short_name: 'IN PROGRESS', is_group_by: false, value: 'in progress' }
  static OwnedChallenges = { name: 'Owned Challenges!!', short_name: 'OWNED CHALLENGES!!', value: 'owned' }
  static Instructors = { name: 'Instructors', short_name: 'INSTRUCTORS', is_group_by: true, value: 'instructor' }
  static Lessons = { name: 'Lessons', short_name: 'LESSONS', value: '' }
  static Artists = { name: 'Artists', short_name: 'ARTISTS', is_group_by: true, value: 'artist' }
  static Songs = { name: 'Songs', short_name: 'Songs', value: '' }
  static Tutorials = { name: 'Tutorials', short_name: 'Tutorials' }
  static Transcriptions = { name: 'Transcriptions', short_name: 'Transcriptions' }
  static PlayAlongs = { name: 'Play-Alongs', short_name: 'Play-Alongs' }
}

const commonMetadata = {
  'lessons': {
    name: 'Lessons',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      genre: ['Blues', 'Classical', 'Funk', 'Jazz', 'Pop', 'R&B/Soul', 'Soundtrack'],
      topic: ['Arpeggios', 'Chord Inversion', 'Chording', 'Scales', 'Styles', 'Techniques', 'Instrument Removed'],
      type: ['Lessons', 'Workouts', 'Performances', 'Live', 'Documentaries', 'Packs', 'Courses'],
      progress: PROGRESS_NAMES,
    },
    sortingOptions: {
      title: 'Sort By',
      type: 'radio',
      items: SortingOptions.AllSortingOptions,
    },
    tabs: [
      Tabs.ForYou,
      Tabs.Singles,
      Tabs.Courses,
    ],
  },
  'songs': {
    name: 'Songs',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      genre: ['Blues', 'Classical', 'Funk', 'Jazz', 'Pop', 'R&B/Soul', 'Soundtrack'],
      topic: ['Arpeggios', 'Chord Inversion', 'Chording', 'Scales', 'Styles', 'Techniques', 'Instrument Removed'],
      type: ['Lessons', 'Workouts', 'Performances', 'Live', 'Documentaries', 'Packs', 'Courses'],
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
    ],
  },
}
const contentMetadata = {
  drumeo: {
    'lessons': {
      name: 'Lessons',
      filterOptions: {
        difficulty: DIFFICULTY_STRINGS,
        type: ['Lessons', 'Workouts', 'Performances', 'Live', 'Documentaries', 'Packs', 'Courses'],
        progress: PROGRESS_NAMES,
      },
      tabs: [
        Tabs.ForYou,
        Tabs.Singles,
        Tabs.Courses,
      ],
    },
  },
}

export function processMetadata(brand, type, withFilters = false) {
  let brandMetaData = contentMetadata[brand]?.[type]
  // If the type is explicitly defined as null or the brand doesn't exist return null
  // Specifically this is for drumeo.student-review
  if (brandMetaData === null) {
    return null
  }
  let commonMetaData = commonMetadata[type]
  brandMetaData = { ...commonMetaData, ...brandMetaData }
  if (Object.keys(brandMetaData).length === 0) {
    return null
  }
  const processedData = {
    type,
    thumbnailUrl: brandMetaData.thumbnailUrl || null,
    name: brandMetaData.name || null,
    description: brandMetaData.description || null,
    url: brandMetaData.url ? brand + brandMetaData.url : brand + '/' + type,
    sort: brandMetaData.sortingOptions || null,
    tabs: brandMetaData.tabs || [],
  }

  if (withFilters && brandMetaData.filterOptions) {
    processedData.filters = transformFilters(brandMetaData.filterOptions)
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
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
