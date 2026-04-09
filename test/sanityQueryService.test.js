import { getFieldsForContentType, SONG_TYPES } from '../src/contentTypeConfig'

const railContentModule = require('../src/services/railcontent.js')

jest.mock('../src/services/contentProgress', () => ({
  ...jest.requireActual('../src/services/contentProgress'),
  getAllStarted: jest.fn().mockResolvedValue([]),
  getAllCompleted: jest.fn().mockResolvedValue([]),
  getAllStartedOrCompleted: jest.fn().mockResolvedValue([]),
}))

const contentProgressModule = require('../src/services/contentProgress')

import { log } from './log.js'
import { initializeTestService } from './initializeTests'
import { getRecommendedForYou, globalConfig, recommendations } from '../src'
import { fetchLessonsFeaturingThisContent } from '../src/services/sanity.js'

const {
  fetchSongById,
  fetchReturning,
  fetchLeaving,
  fetchComingSoon,
  fetchSongArtistCount,
  fetchNewReleases,
  fetchUpcomingEvents,
  fetchByRailContentId,
  fetchByRailContentIds,
  fetchAll,
  fetchAllFilterOptions,
  fetchRelatedLessons,
  fetchAllPacks,
  fetchPackAll,
  fetchLessonContent,
  fetchLiveEvent,
  fetchByReference,
  fetchScheduledReleases,
  getSortOrder,
  fetchShowsData,
  fetchMetadata,
  fetchHierarchy,
  fetchTopLevelParentId,
  fetchOtherSongVersions,
  fetchCommentModContentData,
  fetchSanity,
} = require('../src/services/sanity.js')

const { FilterBuilder } = require('../src/filterBuilder.js')

const { processMetadata } = require('../src/contentMetaData.js')

jest.mock('../src/services/permissions/index.ts', () => ({
  ...jest.requireActual('../src/services/permissions/index.ts'),
  getPermissionsAdapter: jest.fn().mockReturnValue({
    fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [108, 91, 92], isAdmin: false }),
    isAdmin: jest.fn().mockReturnValue(false),
    generatePermissionsFilter: jest.fn().mockReturnValue(
      `(!defined(permission) || references(*[_type == 'permission' && railcontent_id in [108,91,92]]._id))`
    ),
  }),
}))

describe('Sanity Queries', function() {
  beforeEach(() => {
    initializeTestService()
  })

  test.skip('fetchSongById', async () => {
    const id = 380094
    const response = await fetchSongById(id)
    expect(response.id).toBe(id)
  })

  test.skip('fetchReturning', async () => {
    const brand = 'guitareo'
    const page = 1
    const response = await fetchReturning(brand, { pageNumber: 1 })
    expect(response).toBeDefined()
  })

  test.skip('fetchLeaving', async () => {
    const brand = 'guitareo'
    const response = await fetchLeaving(brand, { pageNumber: 1 })
    expect(response).toBeDefined()
  })

  test.skip('fetchComingSoon', async () => {
    const brand = 'guitareo'
    const response = await fetchComingSoon(brand, { pageNumber: 2, contentPerPage: 20 })
    expect(response).toBeDefined()
  })

  test.skip('fetchSongArtistCount', async () => {
    const response = await fetchSongArtistCount('drumeo')
    log(response)
    expect(response).toBeGreaterThan(700)
  }, 10000)

  test.skip('fetchSanity-WithPostProcess', async () => {
    const id = 380094
    const query = `*[railcontent_id == ${id}]{
        ${getFieldsForContentType('song')}
          }`
    const newSlug = 'keysmash1'
    const newField = 1
    const postProcess = (result) => {
      result['new_field'] = newField
      result['slug'] = newSlug
      return result
    }
    const response = await fetchSanity(query, false, { customPostProcess: postProcess })
    log(response)
    expect(response.id).toBe(id)
    expect(response.new_field).toBe(newField)
    expect(response.slug).toBe(newSlug)
  })

  test.skip('fetchSanityPostProcess', async () => {
    const id = 380094
    const response = await fetchByRailContentId(id, 'song')
    expect(response.id).toBe(id)
  })

  test.skip('fetchByRailContentIds', async () => {
    const id = 380094
    const id2 = 402204
    const response = await fetchByRailContentIds([id, id2])
    const returnedIds = response.map((x) => x.id)
    expect(returnedIds[0]).toBe(id)
    expect(returnedIds[1]).toBe(id2)
    expect(returnedIds.length).toBe(2)
  })

  test.skip('fetchByRailContentIds_Order', async () => {
    const id = 380094
    const id2 = 402204
    const response = await fetchByRailContentIds([id2, id])
    const returnedIds = response.map((x) => x.id)
    expect(returnedIds[0]).toBe(id2)
    expect(returnedIds[1]).toBe(id)
    expect(returnedIds.length).toBe(2)
  })

  test.skip('fetchUpcomingEvents', async () => {
    const response = await fetchUpcomingEvents('drumeo', {})
    expect(response.length).toBeGreaterThan(0)
  })

  test.skip('fetchUpcomingNewReleases', async () => {
    const response = await fetchNewReleases('drumeo')
    expect(response.length).toBeGreaterThan(0)
  })

  test.skip('fetchLessonContent', async () => {
    const id = 392820
    const response = await fetchLessonContent(id)
    expect(response.id).toBe(id)
    expect(response.video.type).toBeDefined()
  })

  test.skip('fetchLessonContent-PlayAlong-containts-array-of-videos', async () => {
    const id = 9184
    const response = await fetchLessonContent(id)
    expect(response.id).toBe(id)
    expect(response.video.length).toBeGreaterThanOrEqual(1)
    const firstElement = response.video.find(() => true)
    expect(firstElement.version_name).toBeDefined()
  })

  test.skip('fetchAllSongsInProgress', async () => {
    contentProgressModule.getAllStarted.mockResolvedValueOnce([412941])
    const response = await fetchAll('drumeo', 'song', { progress: 'in progress' })
    expect(response.entity[0].id).toBe(412941)
    expect(response.entity.length).toBe(1)
  })

  // test('fetchAllSongsCompleted', async () => {
  //     var mock = jest.spyOn(dataContext, 'fetchData');
  //     var json = JSON.parse(`{"version":1,"config":{"key":1,"enabled":1,"checkInterval":1,"refreshInterval":2},"data":{"232979":{"s":"completed","p":100,"t":20,"u":1731108082}}}`);
  //     mock.mockImplementation(() =>
  //         json);
  //     const response = await fetchAll('drumeo', 'song', {progress:"completed"});
  //     expect(response.entity[0].id).toBe(232979);
  //     expect(response.entity.length).toBe(1);
  // });
  //
  // test('fetchAllSongsNotStarted', async () => {
  //     var mock = jest.spyOn(dataContext, 'fetchData');
  //     var json = JSON.parse(`{"version":1,"config":{"key":1,"enabled":1,"checkInterval":1,"refreshInterval":2},"data":{"198122":{"s":"started","p":100,"t":20,"u":1731108082},"231622":{"s":"completed","p":100,"t":20,"u":1731108082}}}`);
  //     mock.mockImplementation(() =>
  //         json);  const response = await fetchAll('drumeo', 'song', {progress:"not started"});
  //     expect(response.entity[0].id).not.toBe(198122);
  //     expect(response.entity[0].id).not.toBe(231622);
  // });

  test.skip('fetchNewReleases', async () => {
    const response = await fetchNewReleases('drumeo')
    log(response)
    expect(response[0].id).toBeDefined()
  })

  test.skip('fetchAllWorkouts', async () => {
    const response = await fetchAll('drumeo', 'workout', {})
    log(response)
    expect(response.entity[0].id).toBeDefined()
  })

  test.skip('fetchAllInstructorField', async () => {
    const response = await fetchAll('drumeo', 'quick-tips', { searchTerm: 'Domino Santantonio' })
    log(response)
    expect(response.entity[0].id).toBeDefined()
    expect(response.entity[0].instructors).toBeTruthy()
  })

  test.skip('fetchAllInstructors', async () => {
    const response = await fetchAll('drumeo', 'instructor')
    log(response)
    expect(response.entity[0].name).toBeDefined()
    expect(response.entity[0].coach_card_image).toBeTruthy()
  })

  test.skip('fetchAllSortField', async () => {
    const response = await fetchAll('drumeo', 'rhythmic-adventures-of-captain-carson', {})
    log(response)
    expect(response.entity[0].id).toBeDefined()
    expect(response.entity[0].sort).toBeDefined()
  })

  test.skip('fetchAll-CustomFields', async () => {
    let response = await fetchAll('drumeo', 'course', { customFields: ['garbage'] })
    log(response)
    expect(response.entity[0].garbage).toBeDefined()
    expect(response.entity[0].id).toBeDefined()

    response = await fetchAll('drumeo', 'course', {
      useDefaultFields: false, customFields: ['garbage'],
    })
    log(response)
    expect(response.entity[0].garbage).toBeDefined()
    expect.not.objectContaining(response.entity[0].id)
  })

  test.skip('fetchRelatedLessons', async () => {
    const id = 380094
    const document = await fetchByRailContentId(id, 'song')
    let artist = document.artist.name
    const response = await fetchRelatedLessons(id, 'singeo')
    let relatedDoc = await fetchByRailContentId(response.related_lessons[0].id, 'song')
    // match on artist or any genre
    let isMatch = artist === relatedDoc.artist.name
    isMatch = isMatch || document.genre.some((genre) => {
      return relatedDoc.genre.some((relatedGenre) => {
        return genre._ref === relatedGenre._ref
      })
    })
    expect(isMatch).toBeTruthy()
  })

  test.skip('fetchRelatedLessons-quick-tips', async () => {
    const id = 406213
    const response = await fetchRelatedLessons(id, 'singeo')
    log(response)
    const relatedLessons = response.related_lessons
    expect(Array.isArray(relatedLessons)).toBe(true)
    relatedLessons.forEach((lesson) => {
      expect(lesson.type).toBe('quick-tips')
    })
  })

  test.skip('fetchRelatedLessons-in-rhythm', async () => {
    const id = 236677
    const response = await fetchRelatedLessons(id, 'drumeo')
    log(response)
    const relatedLessons = response.related_lessons
    let episode = 0
    expect(Array.isArray(relatedLessons)).toBe(true)
    relatedLessons.forEach((lesson) => {
      expect(lesson.type).toBe('course-lesson')
    })
  })

  test.skip('fetchRelatedLessons-child', async () => {
    const id = 362278
    const course = await fetchByRailContentId(362277, 'course')
    const lessonIds = course.lessons.map((doc) => doc.id)
    const response = await fetchRelatedLessons(id, 'drumeo')
    log(response.related_lessons)
    const relatedLessons = response.related_lessons
    expect(Array.isArray(relatedLessons)).toBe(true)
    expect(relatedLessons.some((lesson) => lessonIds.includes(lesson.id))).toBe(true)
  }, 10000)

  test('getSortOrder', () => {
    let sort = getSortOrder()
    expect(sort).toBe('published_on desc')
    sort = getSortOrder('slug')
    expect(sort).toBe('!defined(title_for_sort), title_for_sort asc, !defined(title), lower(title) asc')
    sort = getSortOrder('-slug')
    expect(sort).toBe('!defined(title_for_sort), title_for_sort desc, !defined(title), lower(title) desc')
    sort = getSortOrder('-slug', 'drumeo', true)
    expect(sort).toBe('name desc')
    sort = getSortOrder('published-on')
    expect(sort).toBe('published-on asc')
  })

  test.skip('fetchAll-WithProgress', async () => {
    const ids = [410213, 410215]
    let response = await fetchAll('drumeo', 'song', {
      sort: 'slug', progressIds: ids,
    })
    expect(response.entity.length).toBe(2)
    expect((response.entity[0].id = 410215))
    expect((response.entity[1].id = 410213))
    // change the type and we expect no results
    response = await fetchAll('drumeo', 'quick-tip', {
      sort: 'slug', progressIds: ids,
    })
    expect(response.entity.length).toBe(0)
  })

  test.skip('fetchAllFilterOptions-WithProgress', async () => {
    const ids = [410213, 413851]
    let response = await fetchAllFilterOptions('drumeo', '', '', '', 'song', '', ids)
    expect(response.meta.totalResults).toBe(2)
    // change the brand and we expect no results
    response = await fetchAllFilterOptions('singeo', '', '', '', 'song', '', ids)
    expect(response.meta.totalResults).toBe(0)
  })

  test.skip('fetchPackAll', async () => {
    const response = await fetchPackAll(212899) //https://web-staging-one.musora.com/admin/studio/publishing/structure/pack;pack_212899%2Cinspect%3Don
    log(response)
    expect(response.slug).toBe('creative-control')
  })

  test.skip('fetchAllPacks', async () => {
    let response = await fetchAllPacks('drumeo')
    response = await fetchAllPacks('drumeo', 'slug')
    const titles = response.map((doc) => doc.title)

    const sortedTitles = [...titles].sort((a, b) => (a === b ? 0 : a > b ? 1 : -1))

    expect(titles).toStrictEqual(sortedTitles)
    response = await fetchAllPacks('drumeo', 'slug', 'Creative Control')
    expect(response[0].id).toBe(212899)
  })

  test.skip('fetchAll-IncludedFields', async () => {
    let response = await fetchAll('drumeo', 'instructor', { includedFields: ['is_active'] })
    console.log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-IncludedFields-multiple', async () => {
    let response = await fetchAll('drumeo', 'course', {
      includedFields: ['essential,Dynamics', 'essential,Timing', 'difficulty,Beginner'],
    })
    log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-IncludedFields-playalong-multiple', async () => {
    let response = await fetchAll('drumeo', 'play-along', {
      includedFields: ['bpm,91-120', 'bpm,181+', 'genre,Blues'],
    })
    log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-IncludedFields-rudiment-multiple-gear', async () => {
    let response = await fetchAll('drumeo', 'rudiment', {
      includedFields: ['gear,Drum-Set', 'gear,Practice Pad'],
    })
    log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-IncludedFields-coaches-multiple-focus', async () => {
    let response = await fetchAll('drumeo', 'instructor', {
      includedFields: ['focus,Drumline', 'focus,Recording'],
    })
    log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-IncludedFields-songs-multiple-instrumentless', async () => {
    let response = await fetchAll('drumeo', 'song', {
      includedFields: ['instrumentless,true', 'instrumentless,false'],
    })
    log(response)
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchByReference', async () => {
    const response = await fetchByReference('drumeo', { includedFields: ['is_featured'] })
    expect(response.entity.length).toBeGreaterThan(0)
  })

  test.skip('fetchScheduledReleases', async () => {
    const response = await fetchScheduledReleases('drumeo', {})
    expect(response.length).toBeGreaterThan(0)
  })

  test.skip('fetchAll-GroupBy-Genre', async () => {
    let response = await fetchAll('drumeo', 'solo', { groupBy: 'genre' })
    log(response)
    expect(response.entity[0].web_url_path).toContain('/drumeo/genres/')
  })

  test.skip('fetchAll-GroupBy-Artists', async () => {
    let response = await fetchAll('drumeo', 'song', { groupBy: 'artist' })
    log(response)
    expect(response.entity[0].web_url_path).toContain('/drumeo/artists/')
  })

  test.skip('fetchAll-GroupBy-Instructors', async () => {
    let response = await fetchAll('drumeo', 'course', { groupBy: 'instructor' })
    log(response)
    expect(response.entity[0].web_url_path).toContain('/drumeo/coaches/')
  })

  test.skip('fetchShowsData', async () => {
    const response = await fetchShowsData('drumeo')
    log(response)
    expect(response.length).toBeGreaterThan(0)
    const showTypes = response.map((x) => x.type)
    expect(showTypes).toContain('live')
  })

  test.skip('fetchMetadata', async () => {
    const response = await fetchMetadata('drumeo', 'songs')
    log(response)
    expect(response.tabs.length).toBeGreaterThan(0)
  })

  test.skip('fetchShowsData-OddTimes', async () => {
    const response = await fetchShowsData('drumeo')
    log(response)
    expect(response.length).toBeGreaterThan(0)
    const showTypes = response.map((x) => x.type)
    expect(showTypes).toContain('odd-times')
  })

  test.skip('fetchMetadata-Coach-Lessons', async () => {
    const response = await fetchMetadata('drumeo', 'coach-lessons')
    log(response)
    expect(response).toBeDefined()
  })

  test.skip('fetchTopLevelParentId', async () => {
    let contentId = await fetchTopLevelParentId(241250)
    expect(contentId).toBe(241247)
    contentId = await fetchTopLevelParentId(241249)
    expect(contentId).toBe(241247)
    contentId = await fetchTopLevelParentId(241248)
    expect(contentId).toBe(241247)
    contentId = await fetchTopLevelParentId(241247)
    expect(contentId).toBe(241247)
    contentId = await fetchTopLevelParentId(0)
    expect(contentId).toBe(null)
  })

  test.skip('fetchHierarchy', async () => {
    let hierarchy = await fetchHierarchy(241250)
    expect(hierarchy.parents[241250]).toBe(241249)
    expect(hierarchy.parents[241249]).toBe(241248)
    expect(hierarchy.parents[241248]).toBe(241247)
    expect(hierarchy.children[241250]).toStrictEqual([241676])
    expect(hierarchy.children[243085]).toStrictEqual([243170, 243171, 243172, 243174, 243176])
  })

  test.skip('fetchTopLeveldrafts', async () => {
    let id = await fetchTopLevelParentId(401999)
    expect(id).toBe(401999)
  })

  test.skip('fetchCommentData', async () => {
    let data = await fetchCommentModContentData([241251, 241252, 211153])
    expect(data[241251].title).toBe('Setting Up Your Space')
    expect(data[241251].type).toBe('course-lesson')
    expect(data[241251].parentTitle).toBe('Getting Started On The Drums')
    expect(data[241252].title).toBe('Setting Up Your Pedals & Throne')
  })
})

describe('Filter Builder', function() {
  beforeEach(() => {
    initializeTestService()
  })

  test('baseConstructor', async () => {
    const filter = 'railcontent_id = 111'
    let builder = new FilterBuilder(filter, { bypassPermissions: true })
    let finalFilter = await builder.buildFilter(filter)
    let clauses = spliceFilterForAnds(finalFilter)
    // bypassPermissions: true + default statuses auto-sets pullFutureContent: true via getFutureScheduledContentsOnly
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')

    builder = new FilterBuilder('', { bypassPermissions: true })
    finalFilter = await builder.buildFilter(filter)
    clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] status in [...], [1] !defined(deprecated_railcontent_id)
    expect(clauses[0].field).toBe('status')
    expect(clauses[0].operator).toBe('in')
    expect(clauses[1].phrase).toBe('!defined(deprecated_railcontent_id)')
  })

  test('withOnlyFilterAvailableStatuses', async () => {
    const filter = 'railcontent_id = 111'
    const builder = FilterBuilder.withOnlyFilterAvailableStatuses(filter, ['published', 'unlisted'], true)
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id), [3] published_on <=
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[1].condition).toBe(`['published','unlisted']`)
    expect(clauses[3].field).toBe('published_on')
  })

  test('withContentStatusAndFutureScheduledContent', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter, {
      availableContentStatuses: ['published', 'unlisted', 'scheduled'], getFutureScheduledContentsOnly: true,
    })
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    // pullFutureContent is set true by getFutureScheduledContentsOnly so no published_on <= clause
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[1].condition).toBe(`['published','unlisted','scheduled']`)
  })

  test('withUserPermissions', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter)
    const finalFilter = await builder.buildFilter()
    // permissions from initializeTestService: [108, 91, 92]
    // adapter wraps as: (!defined(permission) || references(...))
    const expected = `(!defined(permission) || references(*[_type == 'permission' && railcontent_id in [108,91,92]]._id))`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeTruthy()
  })

  test('withUserPermissionsForPlusUser', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter)
    const finalFilter = await builder.buildFilter()
    // permissions from initializeTestService: [108, 91, 92]
    // adapter wraps as: (!defined(permission) || references(...))
    const expected = `(!defined(permission) || references(*[_type == 'permission' && railcontent_id in [108,91,92]]._id))`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeTruthy()
  })

  test('withPermissionBypass', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter, {
      bypassPermissions: true, pullFutureContent: false,
    })
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // bypassPermissions: true skips the permission clause entirely
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    const expected = `references(*[_type == 'permission' && railcontent_id in [108,91,92]]._id)`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeFalsy()
    expect(clauses[0].field).toBe('railcontent_id')
    expect(clauses[1].field).toBe('status')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')
  })

  test('withPublishOnRestrictions', async () => {
    const filter = 'railcontent_id = 111'
    let builder = new FilterBuilder(filter, {
      pullFutureContent: true, bypassPermissions: true,
    })

    let finalFilter = await builder.buildFilter()
    let clauses = spliceFilterForAnds(finalFilter)
    // pullFutureContent: true — _applyPublishingDateRestrictions does nothing (else branch)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')

    builder = new FilterBuilder(filter, {
      getFutureContentOnly: true, bypassPermissions: true,
    })
    finalFilter = await builder.buildFilter()
    clauses = spliceFilterForAnds(finalFilter)
    // getFutureContentOnly: true — published_on >= is appended
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id), [3] published_on >=
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[3].field).toBe('published_on')
    expect(clauses[3].operator).toBe('>=')
  })

  function spliceFilterForAnds(filter) {
    // this will not correctly split complex filters with && and || conditions.
    let phrases = filter.split(' && ')
    let clauses = []
    phrases.forEach((phrase) => {
      let field = phrase.substring(0, phrase.indexOf(' '))
      //if(field.charAt(0) === '(' ) field = field.substring(1);
      const temp = phrase.substring(phrase.indexOf(' ') + 1)
      const operator = temp.substring(0, temp.indexOf(' '))
      let condition = temp.substring(temp.indexOf(' ') + 1)
      //if(condition.charAt(condition.length) === ')') condition = condition.slice(-1);
      clauses.push({ phrase, field, operator, condition })
    })
    return clauses
  }

  test.skip('fetchAllFilterOptions', async () => {
    let response = await fetchAllFilterOptions('drumeo', [], '', '', 'song', '')
    log(response)
    expect(response.meta.filterOptions.difficulty).toBeDefined()
    expect(response.meta.filterOptions.genre).toBeDefined()
    expect(response.meta.filterOptions.lifestyle).toBeDefined()
    expect(response.meta.filterOptions.instrumentless).toBeDefined()
  })

  test.skip('fetchAllFilterOptions-Rudiment', async () => {
    let response = await fetchAllFilterOptions('drumeo', [], '', '', 'rudiment', '')
    log(response)
    expect(response.meta.filterOptions.gear).toBeDefined()
    expect(response.meta.filterOptions.genre).toBeDefined()
    expect(response.meta.filterOptions.topic).toBeDefined()
  })
  test.skip('fetchAllFilterOptions-PlayAlong', async () => {
    let response = await fetchAllFilterOptions('drumeo', [], '', '', 'play-along', '')
    log(response)
    expect(response.meta.filterOptions.difficulty).toBeDefined()
    expect(response.meta.filterOptions.genre).toBeDefined()
    expect(response.meta.filterOptions.bpm).toBeDefined()
  })

  test.skip('fetchAllFilterOptions-Coaches', async () => {
    let response = await fetchAllFilterOptions('drumeo', [], '', '', 'instructor', '')
    log(response)
    expect(response.meta.filterOptions.focus).toBeDefined()
    expect(response.meta.filterOptions.focus.length).toBeGreaterThan(0)
    expect(response.meta.filterOptions.genre).toBeDefined()
    expect(response.meta.filterOptions.genre.length).toBeGreaterThan(0)
  })

  test.skip('fetchAllFilterOptions-filter-selected', async () => {
    let response = await fetchAllFilterOptions('drumeo', ['theory,notation', 'theory,time signatures', 'creativity,Grooves', 'creativity,Fills & Chops', 'difficulty,Beginner', 'difficulty,Intermediate', 'difficulty,Expert'], '', '', 'course', '')
    log(response)
    expect(response.meta.filterOptions).toBeDefined()
  })
})

describe('MetaData', function() {
  test.skip('customBrandTypeExists', async () => {
    const metaData = processMetadata('guitareo', 'recording')
    expect(metaData.type).toBe('recording')
    expect(metaData.name).toBe('Archives')
    expect(metaData.description).toBeDefined()
  })

  test('invalidContentType', async () => {
    const metaData = processMetadata('guitareo', 'not a real type')
    expect(metaData).toBeNull()
  })

  test.skip('withCommon', async () => {
    const guitareoMetaData = processMetadata('guitareo', 'instructor')
    const drumeoMetaData = processMetadata('drumeo', 'instructor')
    expect(guitareoMetaData.description).not.toBe(drumeoMetaData.description)
    guitareoMetaData.description = ''
    drumeoMetaData.description = ''
    guitareoMetaData.url = ''
    drumeoMetaData.url = ''
    expect(guitareoMetaData).toStrictEqual(drumeoMetaData)
  })
})

describe('api.v1', function() {
  jest.setTimeout(30000)
  beforeEach(() => {
    initializeTestService()
  })
  test.skip('metaDataForLessons', async () => {
    const metaData = await fetchMetadata('drumeo', 'lessons')
    log(metaData)
    expect(metaData.filters).toBeDefined()
    expect(metaData.sort).toBeDefined()
    expect(metaData.tabs).toBeDefined()
  })

  test.skip('metaDataForSongs', async () => {
    const metaData = await fetchMetadata('drumeo', 'songs')
    log(metaData)
    expect(metaData.filters).toBeDefined()
    expect(metaData.sort).toBeDefined()
    expect(metaData.tabs).toBeDefined()
  })

  test.skip('fetchAllFilterOptionsLessons', async () => {
    const response = await fetchAllFilterOptions('pianote', [], null, null, 'lessons')
    log(response)
    expect(response.meta.filters).toBeDefined()
  })

  test.skip('fetchAllFilterOptionsSongs', async () => {
    const response = await fetchAllFilterOptions('pianote', [], null, null, 'songs')
    log(response)
    expect(response.meta.filters).toBeDefined()
  })

  test.skip('fetchLiveEvent', async () => {
    const liveEvent = await fetchLiveEvent('drumeo', 410881)
    log(liveEvent)
    //expect(metaData).toBeNull()
  })



  test.skip('fetchRelatedLessons-pack-bundle-lessons', async () => {
    //https://www.musora.com/singeo/packs/sing-harmony-in-30-days/410537/sing-harmony-in-30-days/410538/day-2/410541
    const railContentId = 410541
    const relatedLessons = await fetchRelatedLessons(railContentId, 'singeo')
    log(relatedLessons)
    const expectedPath = ['', 'singeo', 'packs', 'sing-harmony-in-30-days', '410537', 'sing-harmony-in-30-days', '410538']
    expect(relatedLessons['related_lessons'].length).toBeGreaterThanOrEqual(1)
    relatedLessons['related_lessons'].forEach(document => {
      expect(document.type).toStrictEqual('course-lesson')
      // there are other ways to check that these all have the same parent, but I don't want to write it
      if (document.web_url_path) {
        let web_url_path = document.web_url_path.split('/')
        // remove id and slug
        web_url_path.pop()
        web_url_path.pop()
        expect(web_url_path).toEqual(expectedPath)
      }
    })
  })

  test.skip('fetchRelatedLessons-course-parts', async () => {
    ///drumeo/courses/ultra-compact-drum-set-gear-guide/295177/gigpig-standard-and-extendable/297929
    const railContentId = 297929
    const relatedLessons = await fetchRelatedLessons(railContentId, 'drumeo')
    log(relatedLessons)
    const expectedPath = ['', 'drumeo', 'courses', 'ultra-compact-drum-set-gear-guide', '295177']
    expect(relatedLessons['related_lessons'].length).toBeGreaterThanOrEqual(1)
    relatedLessons['related_lessons'].forEach(document => {
      expect(document.type).toStrictEqual('course-lesson')
      // there are other ways to check that these all have the same parent, but I don't want to write it
      if (document.web_url_path) {
        let web_url_path = document.web_url_path.split('/')
        // remove id and slug
        web_url_path.pop()
        web_url_path.pop()
        expect(web_url_path).toEqual(expectedPath)
      }
    })
  })
})

describe('api.v1.admin', function() {
  beforeEach(() => {
    initializeTestService(false, true)
  })

  test.skip('fetchOtherSongVersions', async () => {
    // much of the licensed content is currently drafted, so this must be run in the admin test-suite
    const railContentId = 386901
    const licenseQuery = `*[railcontent_id == ${railContentId}]{
      'content_ids': *[_type == 'license' && references(^._id)].content[]->railcontent_id
    }[0]`
    const otherReferencedContent = (await fetchSanity(licenseQuery, true))['content_ids']
    log(otherReferencedContent)
    const relatedSongsTypes = await fetchOtherSongVersions(railContentId, 'drumeo', 100)
    log(relatedSongsTypes)
    expect(relatedSongsTypes.length).toBeGreaterThanOrEqual(1)
    relatedSongsTypes.forEach(document => {
      expect(SONG_TYPES).toContain(document.type)
      expect(document.id).not.toStrictEqual(railContentId)
      expect(otherReferencedContent).toContain(document.id)
    })
  })

  test.skip('fetchLessonsFeaturingThisContent', async () => {
    // much of the licensed content is currently drafted, so this must be run in the admin test-suite
    const railContentId = 386901
    const licenseQuery = `*[railcontent_id == ${railContentId}]{
      'content_ids': *[_type == 'license' && references(^._id)].content[]->railcontent_id
    }[0]`
    const otherReferencedContent = (await fetchSanity(licenseQuery, true))['content_ids']
    const relatedNotSongs = await fetchLessonsFeaturingThisContent(railContentId, 'drumeo', 100)
    log(relatedNotSongs)
    expect(relatedNotSongs.length).toBeGreaterThanOrEqual(1)
    relatedNotSongs.forEach(document => {
      expect(SONG_TYPES).not.toContain(document.type)
      expect(document.id).not.toStrictEqual(railContentId)
      expect(otherReferencedContent).toContain(document.id)
    })
  })

  test.skip('fetchRelatedLessons-song-tutorial-children', async () => {
    // When I wrote this it didn't need admin, but something changed. Shrug
    const railContentId = 222633
    const relatedLessons = await fetchRelatedLessons(railContentId, 'pianote')
    log(relatedLessons)
    const expectedPath = ['', 'pianote', 'song-tutorials', 'hallelujah', '221831']
    expect(relatedLessons['related_lessons'].length).toBeGreaterThanOrEqual(1)
    relatedLessons['related_lessons'].forEach(document => {
      expect(document.type).toStrictEqual('song-tutorial-lesson')
      if (document.web_url_path) {
        let web_url_path = document.web_url_path.split('/')
        // remove id, slug
        web_url_path.pop()
        web_url_path.pop()
        expect(web_url_path).toEqual(expectedPath)
      }
    })
  })
})

describe('Recommended System', function() {
  beforeAll(async () => {
    await initializeTestService(true)
  })

  test.skip('getRecommendedForYou', async () => {
    const results = await getRecommendedForYou('drumeo')
    log(results)
    expect(results.id).toBeDefined()
    expect(results.title).toBeDefined()
    expect(results.items).toBeDefined()
    expect(results.items.length).toBeGreaterThanOrEqual(1)
  })

  test.skip('getRecommendedForYou-SeeAll', async () => {
    const results = await getRecommendedForYou('drumeo', 'recommended', { page: 1, limit: 20 })
    log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.data.length).toBeGreaterThanOrEqual(1)
  })

  test.skip('fetchMetadata', async () => {
    const response = await fetchMetadata('singeo', 'recent-activities')
    log(response)
    expect(response.tabs.length).toBeGreaterThan(0)
  })
})


