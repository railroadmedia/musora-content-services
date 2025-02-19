// Metadata is taken from the 'common' element and then merged with the <brand> metadata.
// Brand values are prioritized and will override the same property in the 'common' element.

const PROGRESS_NAMES = ['All', 'In Progress', 'Completed', 'Not Started']
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

export class Tabs {
  static ForYou = { name: 'For You', short_name: 'For You' }
  static Individuals = { name: 'Individuals', short_name: 'Individuals', value: 'type,individuals' }
  static Collections = { name: 'Collections', short_name: 'Collections', value: 'type,collections' }
  static ExploreAll = { name: 'Explore All', short_name: 'Explore All', value: 'type,filters', icon: 'icon-filters'}
  static All = { name: 'All', short_name: 'All', value: '' }
  static Courses = { name: 'Courses', short_name: 'Courses', value: '' }
  static SkillLevel = { name: 'Skill Level', short_name: 'SKILL LEVEL', is_group_by: true, value: 'difficulty_string' }
  static Genres = { name: 'Genres', short_name: 'Genres', is_group_by: true, value: 'genre' }
  static Completed = { name: 'Completed', short_name: 'COMPLETED', is_group_by: false, value: 'completed' }
  static InProgress = { name: 'In Progress', short_name: 'IN PROGRESS', is_group_by: false, value: 'in progress' }
  static OwnedChallenges = { name: 'Owned Challenges!!', short_name: 'OWNED CHALLENGES!!', value: 'owned' }
  static Instructors = { name: 'Instructors', short_name: 'INSTRUCTORS', is_group_by: true, value: 'instructor' }
  static Lessons = { name: 'Lessons', short_name: 'LESSONS', value: '' }
  static Artists = { name: 'Artists', short_name: 'ARTISTS', is_group_by: true, value: 'artist' }
  static Songs = { name: 'Songs', short_name: 'Songs', value: '' }
  static Tutorials = { name: 'Tutorials', short_name: 'Tutorials', value: 'type,tutorials' }
  static Transcriptions = { name: 'Transcriptions', short_name: 'Transcriptions', value: 'type,trancription' }
  static PlayAlongs = { name: 'Play-Alongs', short_name: 'Play-Alongs', value:'type,play along' }
}

export const TabResponseType = {
  SECTIONS: 'sections',
  CATALOG: 'catalog'
};

const commonMetadata = {
  instructor: {
    name: 'Coaches',
    icon: 'icon-coach',
    allowableFilters: ['genre', 'focus'],
    sortBy: '-published_on',
  },
  challenge: {
    name: 'Challenges',
    icon: 'icon-courses',
    description: '... ',
    allowableFilters: ['difficulty', 'topic', 'genre'],
    sortBy: '-published_on',
    modalText:
        'Challenges are a series of guided lessons designed to build your skills day-by-day.',
    tabs: [
      Tabs.All,
      Tabs.SkillLevel,
      Tabs.Genres,
      Tabs.Completed,
      Tabs.OwnedChallenges,
    ],
  },
  'challenge-part': {
    name: 'Challenge Part',
    icon: 'icon-courses',
    description: '... ',
    allowableFilters: ['difficulty', 'genre', 'topic'],
    sortBy: '-published_on',
  },
  course: {
    name: 'Courses',
    allowableFilters: ['difficulty', 'genre', 'essential', 'theory', 'creativity', 'lifestyle'],
    icon: 'icon-courses',
    tabs: [
      Tabs.Courses,
      Tabs.Instructors,
      Tabs.Genres,
    ],
  },
  pack: {
    allowableFilters: [],
  },
  'student-review': {
    name: 'Student Reviews',
    icon: 'icon-student-focus',
    allowableFilters: ['difficulty', 'genre', 'essential', 'theory', 'creativity', 'lifestyle'],
    sortBy: '-published_on',
    tabs: [
      Tabs.Lessons,
      Tabs.Instructors,
      Tabs.Genres,
    ],
  },
  song: {
    name: 'Songs',
    icon: 'icon-songs',
    description:
          'Play the songs you love with note-for-note transcriptions and handy practice tools.',
    allowableFilters: ['difficulty', 'genre', 'lifestyle', 'instrumentless'],
    tabs: [
      Tabs.Songs,
      Tabs.Artists,
      Tabs.Genres,
    ],
  },
  'quick-tips': {
    name: 'Quick Tips',
    icon: 'icon-shows',
    description:
          'Only have 10 minutes? These short lessons are designed to inspire you with quick tips and exercises, even if you don’t have lots of time to practice.',
    allowableFilters: ['difficulty', 'genre', 'essential', 'theory', 'lifestyle', 'creativity'],
    sortBy: '-published_on',
    tabs: [
      Tabs.Lessons,
      Tabs.Instructors,
      Tabs.Genres,
    ],
  },
  'question-and-answer': {
    name: 'Q&A',
    description:
          'Each week we go live to answer your questions. Submit your questions in advance using the button below, in the Q&A thread in the forums, or live in the community chat.',
    allowableFilters: ['difficulty', 'genre', 'essential', 'theory'],
    sortBy: '-published_on',
  },
  recommendation: {
    tabs: [
      { name: 'All', is_group_by: true, value: ['group_by,Recommended'] },
      { name: 'Songs', value: ['filter,song'] },
      { name: 'Lessons', value: ['filter,lesson'] },
      { name: 'Workouts', value: ['filter,workout'] },
    ],
  },
  workout: {
    name: 'Workouts',
    shortname: 'Workouts',
    allowableFilters: ['difficulty', 'genre', 'topic'],
    tabs: [
      Tabs.All,
      {
        name: '5 Minutes',
        short_name: '5 MINS',
        is_required_field: true,
        value: 'length_in_seconds,-450',
        value_web: ['length_in_seconds < 450'],
      },
      {
        name: '10 Minutes',
        short_name: '10 MINS',
        is_required_field: true,
        value: 'length_in_seconds,450-750',
        value_web: ['length_in_seconds > 451', 'length_in_seconds < 751'],
      },
      {
        name: '15+ Minutes',
        short_name: '15+ MINS',
        is_required_field: true,
        value: 'length_in_seconds,750+',
        value_web: ['length_in_seconds > 750'],
      },
      Tabs.Instructors,
    ],
    modalText:
        'Workouts are fun play-along lessons that help hone your musical skills. They cover various topics, and have multiple difficulty and duration options — so there’s always a perfect Workout for you. Just pick one, press start, and play along!',
  },
  'coach-lessons': {
    allowableFilters: ['difficulty', 'genre', 'essential', 'theory', 'lifestyle', 'type'],
  },
  'lesson-history': {
    name: 'Lesson History',
    shortname: 'Lesson History',
    icon: 'bookmark',
    allowableFilters: ['difficulty', 'type'],
    sortBy: '-published_on',
    tabs: [
      Tabs.InProgress,
      Tabs.Completed,
    ],
  },
  'new-release': {
    name: 'New Releases',
    description:
          "Here's a list of all lessons recently added to Drumeo. Browse on your own or use search to find whatever it is you'd like to learn!",
    allowableFilters: ['type'],
    sortBy: '-published_on',
    tabs: [
      Tabs.Lessons,
    ],
  },
  'lessons': {
    name: 'Lessons',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      style: ['Classical', 'Funk', 'Jazz', 'Pop', 'R&B/Soul', 'Soundtrack', 'Blues'],
      type: ['Single Lessons', 'Practice Alongs', 'Performances', 'Live Archives', 'Student Archives',  'Documentaries', 'Courses', 'Shows'],
      progress: PROGRESS_NAMES,
    },
    sortingOptions: {
      title: 'Sort By',
      type: 'radio',
      items: SortingOptions.AllSortingOptions,
    },
    tabs: [
      Tabs.ForYou,
      Tabs.Individuals,
      Tabs.Collections,
      Tabs.ExploreAll
    ],
  },
  'songs': {
    name: 'Songs',
    filterOptions: {
      difficulty: DIFFICULTY_STRINGS,
      style: ['Blues','CCM/Worship','Christmas','Classical','Country','Disco','Electronic','Folk','Funk','Hip-Hop/Rap','Holiday','Jazz','Soundtrack',
      'Traditional','Latin/World','Metal','Pop','R&B/Soul','Ragtime','Reggae','Rock'],
      type: ['Tutorial', 'Transcription', 'Jam Track'],
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
      Tabs.ExploreAll
    ],
  },
}
const contentMetadata = {
  drumeo: {
    instructor: {
      description:
          'Your drumming journey is unique. You need personalized coaching that helps you reach your goals. Learn from some of the best drummers in the world!',
    },
    live: {
      thumbnailUrl: 'https://dpwjbsxqtam5n.cloudfront.net/shows/show-live.jpg',
      name: 'Live',
      url: '/live-streams',
      shortname: 'Live Lessons',
      icon: 'icon-shows',
      description:
                    'Practice sessions, Q&A, celebrations, and more are available during Drumeo live lessons. Subscribe to an event or the whole calendar, so you don’t miss out!',
      allowableFilters: ['difficulty', 'genre', 'essential', 'theory'],
      sortBy: '-published_on',
      tabs: [
        Tabs.Lessons,
        Tabs.Instructors,
        Tabs.Genres,
      ],
    },
    'odd-times': {
      thumbnailUrl:
                        'https://musora.com/cdn-cgi/imagedelivery/0Hon__GSkIjm-B_W77SWCA/1bf6fc7a-d1a5-4934-d322-b9f6da454000/public',
      name: 'Odd Times With Aaron Edgar',
      shortname: 'Episodes',
      icon: 'icon-shows',
      allowableFilters: [],
      sortBy: 'sort',
    },
    rudiment: {
      name: 'Rudiments',
      icon: 'icon-drums',
      description:
            'The 40 drum rudiments are essential for any drummer, no matter the style, genre, or scenario. You can use the videos below to help you learn, practice, and perfect every single one.',
      allowableFilters: ['difficulty', 'genre', 'gear', 'topic'],
      tabs: [
        Tabs.All,
        {
          name: 'Drags',
          short_name: 'DRAGS',
          is_required_field: true,
          value: 'topic,Drags',
        },
        {
          name: 'Flams',
          short_name: 'FLAMS',
          is_required_field: true,
          value: 'topic,Flams',
        },
        {
          name: 'Paradiddles',
          short_name: 'PARADIDDLES',
          is_required_field: true,
          value: 'topic,Paradiddles',
        },
        {
          name: 'Rolls',
          short_name: 'ROLLS',
          is_required_field: true,
          value: 'topic,Rolls',
        },
      ],
      sortBy: 'sort',
    },
    'play-along': {
      name: 'Play Alongs',
      icon: 'icon-play-alongs',
      description:
            'Add your drumming to high-quality drumless play-along tracks - with handy playback tools to help you create the perfect performance.',
      allowableFilters: ['difficulty', 'genre', 'bpm'],
      tabs: [
        {
          name: 'All Play-Alongs',
          short_name: 'ALL',
          value: '',
        },
      ],
    },
    'lessons': {
      name: 'Lessons',
      filterOptions: {
        difficulty: DIFFICULTY_STRINGS,
        style: ['Classical', 'Funk', 'Jazz', 'Pop', 'R&B/Soul', 'Soundtrack', 'Blues'],
        type: ['Single Lessons', 'Practice Alongs', 'Performances', 'Live Archives', 'Student Archives',  'Documentaries', 'Courses', 'Shows'],
        progress: PROGRESS_NAMES,
      },
      tabs: [
        Tabs.ForYou,
        Tabs.Individuals,
        Tabs.Collections,
        Tabs.ExploreAll
      ],
    },
  },
  guitareo: {
    instructor: {
      description:
          'Tackle your next guitar goal with bite-sized courses from many of the world\'s best guitarists.',
    },
    recording: {
      name: 'Archives',
      shortname: 'Lessons',
      icon: 'icon-library',
      description:
          'Miss a live event or just want to watch a particular episode again? This is the place to do it. All of the Guitareo live broadcasts are archived here for you to watch at your leisure. If you have any questions or want to discuss the topics mentioned in the videos you can always post in the forum.',
      allowableFilters: ['difficulty', 'genre'],
      tabs: [
        Tabs.Lessons,
        Tabs.Instructors,
        Tabs.Genres,
      ],
    },
  },
  singeo: {
    'student-review': {
      thumbnailUrl: 'https://d1923uyy6spedc.cloudfront.net/student-reviews.png',
      icon: 'icon-student-focus',
      description:
                    'Want feedback on your singing? Submit a video for student review. We will watch your submission and then provide helpful encouragement and feedback. This is a great way to build accountability and benefit from the expertise of our teachers.',
    },
  }
}

export const typeWithSortOrder = [
  'in-rhythm',
  'diy-drum-experiments',
  'rhythmic-adventures-of-captain-carson',
]

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

  if (withFilters && !brandMetaData.filterOptions) {
    Object.keys(brandMetaData).forEach((key) => {
      if (!['thumbnailUrl', 'name', 'description'].includes(key)) {
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
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
