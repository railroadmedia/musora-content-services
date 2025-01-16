import {getFieldsForContentType} from "../src/contentTypeConfig";
const railContentModule = require('../src/services/railcontent.js')

import {
    fetchCommentModContentData,
    fetchMethodPreviousNextLesson,
    fetchSanity
} from "../src/services/sanity";
import {log} from './log.js';
import {initializeTestService} from "./initializeTests";
import {dataContext} from "../src/services/contentProgress";
import {fetchOwnedChallenges} from "../src";

const {
    fetchSongById,
    fetchArtists,
    fetchSongArtistCount,
    fetchRelatedSongs,
    fetchNewReleases,
    fetchUpcomingEvents,
    fetchByRailContentId,
    fetchByRailContentIds,
    fetchAll,
    fetchAllOld,
    fetchAllFilterOptions,
    fetchFoundation,
    fetchMethod,
    fetchRelatedLessons,
    fetchAllPacks,
    fetchPackAll,
    fetchLessonContent,
    fetchLiveEvent,
    fetchCoachLessons,
    fetchByReference,
    fetchScheduledReleases,
    getSortOrder,
    fetchShowsData,
    fetchMetadata,
    fetchNextPreviousLesson,
    fetchHierarchy,
    fetchTopLevelParentId
} = require('../src/services/sanity.js');

const {
    FilterBuilder,
} = require('../src/filterBuilder.js');

const {
    processMetadata,
} = require('../src/contentMetaData.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        initializeTestService();
    });

    test('fetchSongById', async () => {
        const id = 380094;
        const response = await fetchSongById(id);
        expect(response.id).toBe(id);

    });


    test('fetchArtists', async () => {
        const response = await fetchArtists('drumeo');
        const artistNames = response.map((x) => x.name);
        expect(artistNames).toContain("Audioslave");

    }, 10000);

    test('fetchSongArtistCount', async () => {
        const response = await fetchSongArtistCount('drumeo');
        log(response);
        expect(response).toBeGreaterThan(1000);
    }, 10000);

    test('fetchSanity-WithPostProcess', async () => {
        const id = 380094;
        const query = `*[railcontent_id == ${id}]{
        ${getFieldsForContentType('song')}
          }`
        const newSlug = 'keysmash1';
        const newField = 1
        const postProcess = (result) => {
            result['new_field'] = newField;
            result['slug'] = newSlug;
            return result;
        };
        const response = await fetchSanity(query, false, {customPostProcess: postProcess});
        log(response);
        expect(response.id).toBe(id);
        expect(response.new_field).toBe(newField);
        expect(response.slug).toBe(newSlug);
    });


    test('fetchSanityPostProcess', async () => {
        const id = 380094;
        const response = await fetchByRailContentId(id, "song");
        expect(response.id).toBe(id);
    });

    test('fetchByRailContentIds', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id, id2]);
        const returnedIds = response.map((x) => x.id);
        expect(returnedIds[0]).toBe(id);
        expect(returnedIds[1]).toBe(id2);
        expect(returnedIds.length).toBe(2);
    });

    test('fetchByRailContentIds_Order', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id2, id]);
        const returnedIds = response.map((x) => x.id);
        expect(returnedIds[0]).toBe(id2);
        expect(returnedIds[1]).toBe(id);
        expect(returnedIds.length).toBe(2);
    });

    test('fetchUpcomingEvents', async () => {
        const response = await fetchUpcomingEvents('drumeo', {});
        expect(response.length).toBeGreaterThan(0);
    });

    test('fetchUpcomingNewReleases', async () => {
        const response = await fetchNewReleases('drumeo');
        expect(response.length).toBeGreaterThan(0);
    });


    test('fetchLessonContent', async () => {
        const id = 380094;
        const response = await fetchLessonContent(id);
        expect(response.id).toBe(id);
    });

    test('fetchAllSongsInProgress', async () => {
       var mock = jest.spyOn(dataContext, 'fetchData');
        var json = JSON.parse(`{"version":1,"config":{"key":1,"enabled":1,"checkInterval":1,"refreshInterval":2},"data":{"412941":{"s":"started","p":6,"t":20,"u":1731108082}}}`);
        mock.mockImplementation(() =>
            json);
        const response = await fetchAll('drumeo', 'song',{progress:"in progress"});
        expect(response.entity[0].id).toBe(412941);
        expect(response.entity.length).toBe(1);
    });

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

    test('fetchNewReleases', async () => {
        const response = await fetchNewReleases('drumeo');
        log(response);
        expect(response[0].id).toBeDefined();
    });

    test('fetchAllWorkouts', async () => {
        const response = await fetchAll('drumeo', 'workout', {});
        log(response);
        expect(response.entity[0].id).toBeDefined();
    });

    test('fetchAllInstructorField', async () => {
        const response = await fetchAll('drumeo', 'quick-tips', {searchTerm: 'Domino Santantonio'});
        log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].instructors).toBeTruthy();
    });

    test('fetchAllInstructors', async () => {
        const response = await fetchAll('drumeo', 'instructor');
        log(response);
        expect(response.entity[0].name).toBeDefined();
        expect(response.entity[0].coach_card_image).toBeTruthy();
    });

    test('fetchAllSortField', async () => {
        const response = await fetchAll('drumeo', 'rhythmic-adventures-of-captain-carson', {});
        log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].sort).toBeDefined();
    });


    test('fetchAllChallenges', async () => {
        const response = await fetchAll('drumeo', 'challenge', {});
        log(response);
        expect(response.entity[0].registration_url).toBeDefined();
        expect(response.entity[0].enrollment_start_time).toBeDefined();
        expect(response.entity[0].enrollment_end_time).toBeDefined();

        expect(response.entity[0].lesson_count).toBeDefined();
        expect(response.entity[0].primary_cta_text).toBeDefined();
        expect(response.entity[0].challenge_state).toBeDefined();
        expect(response.entity[0].challenge_state_text).toBeDefined();

    });

    test('fetchAllChallengesByGenre', async () => {
        const response = await fetchAll('drumeo', 'challenge', {groupBy:'genre'});
        expect(response.entity[0].type).toBe('genre');
        expect(response.entity[0].lessons).toBeDefined();
    });

    test('fetchAllChallengesByDifficulty', async () => {
        const response = await fetchAll('drumeo', 'challenge', {groupBy:'difficulty_string'});
        expect(response.entity[0].name).toBeDefined();
        expect(response.entity[0].lessons).toBeDefined();
        expect(response.entity[0].lessons.length).toBeGreaterThan(0);
    });

    test('fetchAllChallengesByCompleted', async () => {
        var mock = jest.spyOn(railContentModule, 'fetchCompletedChallenges');
        mock.mockImplementation(() => [402204]);
        const response = await fetchAll('drumeo', 'challenge', {groupBy:'completed'});
        expect(response.entity.length).toBe(1);
    });

    test('fetchAllChallengesByOwned', async () => {
        var mock = jest.spyOn(railContentModule, 'fetchOwnedChallenges');
        mock.mockImplementation(() => [402204]);
        const response = await fetchAll('drumeo', 'challenge', {groupBy:'owned'});
        expect(response.entity.length).toBe(1);
    });

    test('fetchAll-CustomFields', async () => {
        let response = await fetchAll('drumeo', 'challenge', {customFields: ['garbage']});
        log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect(response.entity[0].id).toBeDefined();

        response = await fetchAll('drumeo', 'challenge', {useDefaultFields: false, customFields: ['garbage']});
        log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect.not.objectContaining(response.entity[0].id);
    });

    test('fetchRelatedLessons', async () => {
        const id = 380094;
        const document = await fetchByRailContentId(id, 'song');
        let artist = document.artist.name;
        const response = await fetchRelatedLessons(id, 'singeo');
        let relatedDoc = await fetchByRailContentId(response.related_lessons[0].id, 'song');
        // match on artist or any genre
        let isMatch = artist === relatedDoc.artist.name;
        isMatch = isMatch || document.genre.some((genre) => {
            return relatedDoc.genre.some((relatedGenre) => {
                return genre._ref === relatedGenre._ref;
            });
        });
        expect(isMatch).toBeTruthy();
    });

    test('fetchRelatedLessons-quick-tips', async () => {
        const id = 406213;
        const response = await fetchRelatedLessons(id, 'singeo');
        log(response);
        const relatedLessons = response.related_lessons;
        expect(Array.isArray(relatedLessons)).toBe(true);
        relatedLessons.forEach(lesson => {
            expect(lesson._type).toBe('quick-tips');
        });
    });

    test('fetchRelatedLessons-in-rhythm', async () => {
        const id = 236677;
        const response = await fetchRelatedLessons(id, 'drumeo');
        log(response);
        const relatedLessons = response.related_lessons;
        let episode = 0;
        expect(Array.isArray(relatedLessons)).toBe(true);
        relatedLessons.forEach(lesson => {
            expect(lesson._type).toBe('in-rhythm');
            expect(lesson.sort).toBeGreaterThan(episode);
            episode = lesson.sort;
        });
    });

    test('fetchRelatedLessons-child', async () => {
        const id = 362278;
        const course = await fetchByRailContentId(362277, 'course');
        const lessonIds = course.lessons.map((doc) => doc.id);
        const response = await fetchRelatedLessons(id, 'drumeo');
        log(response.related_lessons);
        const relatedLessons = response.related_lessons;
        expect(Array.isArray(relatedLessons)).toBe(true);
        expect(relatedLessons.some(
            lesson => lessonIds.includes(lesson.id)
        )).toBe(true);
    }, 10000);

    test('getSortOrder', () => {
        let sort = getSortOrder()
        expect(sort).toBe('published_on desc');
        sort = getSortOrder('slug')
        expect(sort).toBe('title asc');
        sort = getSortOrder('-slug')
        expect(sort).toBe('title desc');
        sort = getSortOrder('-slug', 'drumeo', true);
        expect(sort).toBe('name desc');
        sort = getSortOrder('published-on')
        expect(sort).toBe('published_on asc');
    });

    test('fetchMethod', async () => {
        const response = await fetchMethod('drumeo', 'drumeo-method');
        log(response);
        expect(response).toBeDefined();
        expect(response.levels.length).toBeGreaterThan(0);
    });

    test('fetchAll-WithProgress', async () => {
        const ids = [410213, 410215];
        let response = await fetchAll('drumeo', 'song', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(2);
        expect(response.entity[0].id = 410215);
        expect(response.entity[1].id = 410213);
        // change the type and we expect no results
        response = await fetchAll('drumeo', 'quick-tip', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(0);
    });

    test('fetchAllFilterOptions-WithProgress', async () => {
        const ids = [410213, 413851];
        let response = await fetchAllFilterOptions('drumeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(2);
        // change the brand and we expect no results
        response = await fetchAllFilterOptions('singeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(0);

    });

    test('fetchFoundation', async () => {
        const response = await fetchFoundation('foundations-2019');
        log(response);
        expect(response.units.length).toBeGreaterThan(0);
        expect(response.type).toBe('foundation');
    });

    test('fetchPackAll', async () => {
        const response = await fetchPackAll(212899); //https://web-staging-one.musora.com/admin/studio/publishing/structure/pack;pack_212899%2Cinspect%3Don
        log(response);
        expect(response.slug).toBe('creative-control');
    });

    test('fetchAllPacks', async () => {
        let response = await fetchAllPacks('drumeo');
        response = await fetchAllPacks('drumeo', 'slug');
        const titles = response.map((doc) => doc.title);

        const sortedTitles = [...titles].sort((a, b) => a === b ? 0 : a > b ? 1 : -1);

        expect(titles).toStrictEqual(sortedTitles);
        response = await fetchAllPacks('drumeo', 'slug', 'Creative Control');
        expect(response[0].id).toBe(212899);
    });

    test('fetchCoachLessons', async () => {
        const response = await fetchCoachLessons('drumeo', 411493, {});
        expect(response.entity.length).toBeGreaterThan(0);
    });
    test('fetchCoachLessons-WithTypeFilters', async () => {
        const response = await fetchAllFilterOptions('drumeo', ['type,course', 'type,live'], '', '', 'coach-lessons', '', [], 31880);
        log(response);
        expect(response.meta.filterOptions.difficulty).toBeDefined();
        expect(response.meta.filterOptions.type).toBeDefined();
        expect(response.meta.filterOptions.lifestyle).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
    });

    test('fetchCoachLessons-WithTypeFilters-InvalidContentType', async () => {
        const brand = 'drumeo';
        const coachId = 31880;
        const invalidContentType = 'course'; // Not 'coach-lessons'

        await expect(fetchAllFilterOptions(brand, ['type,course', 'type,live'], '', '', invalidContentType, '', [], coachId))
            .rejects
            .toThrow("Invalid contentType: 'course' for coachId. It must be 'coach-lessons'.");
    });

    test('fetchCoachLessons-IncludedFields', async () => {
        const response = await fetchCoachLessons('drumeo', 31880, {includedFields: ['genre,Pop/Rock', 'difficulty,Beginner']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });


    test('fetchAll-IncludedFields', async () => {
        let response = await fetchAll('drumeo', 'instructor', {includedFields: ['is_active']});
        console.log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-multiple', async () => {
        let response = await fetchAll('drumeo', 'course', {includedFields: ['essential,Dynamics', 'essential,Timing', 'difficulty,Beginner']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-playalong-multiple', async () => {
        let response = await fetchAll('drumeo', 'play-along', {includedFields: ['bpm,91-120', 'bpm,181+', 'genre,Blues']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-rudiment-multiple-gear', async () => {
        let response = await fetchAll('drumeo', 'rudiment', {includedFields: ['gear,Drum-Set', 'gear,Practice Pad']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-coaches-multiple-focus', async () => {
        let response = await fetchAll('drumeo', 'instructor', {includedFields: ['focus,Drumline', 'focus,Recording']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields-songs-multiple-instrumentless', async () => {
        let response = await fetchAll('drumeo', 'song', {includedFields: ['instrumentless,true', 'instrumentless,false']});
        log(response);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchByReference', async () => {
        const response = await fetchByReference('drumeo', {includedFields: ['is_featured']});
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchScheduledReleases', async () => {
        const response = await fetchScheduledReleases('drumeo', {});
        expect(response.length).toBeGreaterThan(0);
    });

    test('fetchAll-GroupBy-Genre', async () => {
        let response = await fetchAll('drumeo', 'solo', {groupBy: 'genre'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/genres/');
    });

    test('fetchAll-GroupBy-Artists', async () => {
        let response = await fetchAll('drumeo', 'song', {groupBy: 'artist'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/artists/');
    });

    test('fetchAll-GroupBy-Instructors', async () => {
        let response = await fetchAll('drumeo', 'course', {groupBy: 'instructor'});
        log(response);
        expect(response.entity[0].web_url_path).toContain('/drumeo/coaches/');
    });

    test('fetchShowsData', async () => {
        const response = await fetchShowsData('drumeo');
        log(response);
        expect(response.length).toBeGreaterThan(0);
        const showTypes = response.map((x) => x.type);
        expect(showTypes).toContain('live');
    });

    test('fetchMetadata', async () => {
        const response = await fetchMetadata('drumeo', 'song');
        log(response);
        expect(response.tabs.length).toBeGreaterThan(0);
    });

    test('fetchShowsData-OddTimes', async () => {
        const response = await fetchShowsData('drumeo');
        log(response);
        expect(response.length).toBeGreaterThan(0);
        const showTypes = response.map((x) => x.type);
        expect(showTypes).toContain('odd-times');
    });

    test('fetchMetadata-Coach-Lessons', async () => {
        const response = await fetchMetadata('drumeo', 'coach-lessons');
        log(response);
        expect(response).toBeDefined();
    });

    test('fetchNextPreviousLesson-Show-With-Episodes', async () => {
        const id = 227136;
        const document = await fetchByRailContentId(id, 'behind-the-scenes');
        const response = await fetchNextPreviousLesson(id);
        log(response);
        expect(response.prevLesson).toBeDefined();
        expect(response.prevLesson.sort).toBeLessThanOrEqual(document.sort);
        expect(response.nextLesson).toBeDefined();
        expect(response.nextLesson.sort).toBeGreaterThanOrEqual(document.sort);
    });

    test('fetchMethodNextPreviousLesson-Last', async () => {
        const id = 260171;
        const methodId = 259060;
        const response = await fetchMethodPreviousNextLesson(id, methodId);
        log(response);
        expect(response.prevLesson).toBeDefined();
        expect(response.prevLesson.id).toBe(260170);
        expect(response.prevLesson.type).toBe('course-part');
        expect(response.nextLesson).not.toBeDefined();
    });

    test('fetchNextPreviousLesson-Method-Lesson', async () => {
        const id = 241265;
        const response = await fetchNextPreviousLesson(id);
        log(response);
        expect(response.prevLesson).toBeDefined();
        expect(response.prevLesson.id).toBe(241264);
        expect(response.prevLesson.type).toBe('learning-path-lesson');
        expect(response.nextLesson).toBeDefined();
        expect(response.nextLesson.id).toBe(241267);
        expect(response.nextLesson.type).toBe('learning-path-lesson');
    });

    test('fetchNextPreviousLesson-Quick-Tips', async () => {
        const id = 412277;
        const response = await fetchNextPreviousLesson(id);
        const document = await fetchByRailContentId(id, 'quick-tips');
        const documentPublishedOn = new Date(document.published_on);
        const prevDocumentPublishedOn = new Date(response.prevLesson.published_on);
        const nextDocumentPublishedOn = new Date(response.nextLesson.published_on);
        expect(response.prevLesson).toBeDefined();
        expect(prevDocumentPublishedOn.getTime()).toBeLessThan(documentPublishedOn.getTime());
        expect(response.nextLesson).toBeDefined();
        expect(documentPublishedOn.getTime()).toBeLessThan(nextDocumentPublishedOn.getTime());
    });

    test('fetchNextPreviousLesson-Song', async () => {
        const id = 414041;
        const response = await fetchNextPreviousLesson(id);
        const document = await fetchByRailContentId(id, 'song');
        const documentPublishedOn = new Date(document.published_on);
        const prevDocumentPublishedOn = new Date(response.prevLesson.published_on);
        const nextDocumentPublishedOn = new Date(response.nextLesson.published_on);
        expect(response.prevLesson).toBeDefined();
        expect(prevDocumentPublishedOn.getTime()).toBeLessThanOrEqual(documentPublishedOn.getTime());
        expect(response.nextLesson).toBeDefined();
        expect(documentPublishedOn.getTime()).toBeLessThanOrEqual(nextDocumentPublishedOn.getTime());
    });

    test('fetchTopLevelParentId', async () => {
        let contentId = await fetchTopLevelParentId(241250);
        expect(contentId).toBe(241247);
        contentId = await fetchTopLevelParentId(241249);
        expect(contentId).toBe(241247);
        contentId = await fetchTopLevelParentId(241248);
        expect(contentId).toBe(241247);
        contentId = await fetchTopLevelParentId(241247);
        expect(contentId).toBe(241247);
        contentId = await fetchTopLevelParentId(0);
        expect(contentId).toBe(null);
    });

    test('fetchHierarchy', async () => {
        let hierarchy = await fetchHierarchy(241250);
        expect(hierarchy.parents[241250]).toBe(241249);
        expect(hierarchy.parents[241249]).toBe(241248);
        expect(hierarchy.parents[241248]).toBe(241247);
        expect(hierarchy.children[241250]).toStrictEqual([241676]);
        expect(hierarchy.children[243085]).toStrictEqual([243170, 243171, 243172, 243174, 243176]);
    });

    test('fetchTopLeveldrafts', async () => {
        let id = await fetchTopLevelParentId(401999);
        expect(id).toBe(401999);
    });

    test('fetchCommentData', async()=>{
        let data = await fetchCommentModContentData([241251,241252, 211153]);
        expect(data[241251].title).toBe("Setting Up Your Space");
        expect(data[241251].type).toBe("learning-path-lesson");
        expect(data[241251].url).toBe( "/drumeo/method/drumeo-method/241247/getting-started-on-the-drums/241248/gear/241249/setting-up-your-space/241251");
        expect(data[241251].parentTitle).toBe("Gear");
        expect(data[241252].title).toBe("Setting Up Your Pedals & Throne");
    });
});

describe('Filter Builder', function () {

    beforeEach(() => {
        initializeTestService();
    });

    test('baseConstructor', async () => {
        const filter = 'railcontent_id = 111'
        let builder = new FilterBuilder(filter, {bypassPermissions: true});
        let finalFilter = await builder.buildFilter(filter);
        let clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('(status');
        expect(clauses[3].field).toBe('published_on');

        builder = new FilterBuilder('', {bypassPermissions: true});
        finalFilter = await builder.buildFilter(filter);
        clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].field).toBe('(status');
        expect(clauses[0].operator).toBe('in');
        expect(clauses[2].field).toBe('published_on');
        expect(clauses[2].operator).toBe('>=');
    });

    test('withOnlyFilterAvailableStatuses', async () => {
        const filter = 'railcontent_id = 111'
        const builder = FilterBuilder.withOnlyFilterAvailableStatuses(filter, ['published', 'unlisted'], true);
        const finalFilter = await builder.buildFilter();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('status');
        expect(clauses[1].operator).toBe('in');
        // not sure I like this
        expect(clauses[1].condition).toBe("['published','unlisted']");
        expect(clauses[2].field).toBe('published_on');
    });

    test('withContentStatusAndFutureScheduledContent', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter, {
            availableContentStatuses: ['published', 'unlisted', 'scheduled'],
            getFutureScheduledContentsOnly: true
        });
        const finalFilter = await builder.buildFilter();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('(status'); // extra ( because it's a multi part filter
        expect(clauses[1].operator).toBe('in');
        // getFutureScheduledContentsOnly doesn't make a filter that's splicable, so we match on the more static string
        const expected = "['published','unlisted'] || (status == 'scheduled' && defined(published_on) && published_on >=";
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withUserPermissions', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter);
        const finalFilter = await builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [78,91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withUserPermissionsForPlusUser', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter);
        const finalFilter = await builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [78,91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeTruthy();
    });

    test('withPermissionBypass', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter,
            {
                bypassPermissions: true,
                pullFutureContent: false
            });
        const finalFilter = await builder.buildFilter();
        const expected = "references(*[_type == 'permission' && railcontent_id in [78,91,92]]._id)"
        const isMatch = finalFilter.includes(expected);
        expect(isMatch).toBeFalsy();
        const clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].field).toBe('railcontent_id');
        expect(clauses[1].field).toBe('(status');
        expect(clauses[3].field).toBe('published_on');

    });


    test('withPublishOnRestrictions', async () => {
        // testing dates is a pain more frustration than I'm willing to deal with, so I'm just testing operators.

        const filter = 'railcontent_id = 111'
        let builder = new FilterBuilder(filter, {
            pullFutureContent: true,
            bypassPermissions: true
        });

        let finalFilter = await builder.buildFilter();
        let clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('(status');
        expect(clauses[1].operator).toBe('in');
        expect(clauses[2].phrase).toBe('defined(published_on)');
        expect(clauses[3].field).toBe('published_on');

        builder = new FilterBuilder(filter,
            {
                getFutureContentOnly: true,
                bypassPermissions: true
            });
        finalFilter = await builder.buildFilter();
        clauses = spliceFilterForAnds(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[3].field).toBe('published_on');
        expect(clauses[3].operator).toBe('>=');
    });

    function spliceFilterForAnds(filter) {
        // this will not correctly split complex filters with && and || conditions.
        let phrases = filter.split(' && ');
        let clauses = [];
        phrases.forEach((phrase) => {
            let field = phrase.substring(0, phrase.indexOf(' '));
            //if(field.charAt(0) === '(' ) field = field.substring(1);
            const temp = phrase.substring(phrase.indexOf(' ') + 1);
            const operator = temp.substring(0, temp.indexOf(' '));
            let condition = temp.substring(temp.indexOf(' ') + 1);
            //if(condition.charAt(condition.length) === ')') condition = condition.slice(-1);
            clauses.push({phrase, field, operator, condition});
        });
        return clauses;
    }

    test('fetchAllFilterOptions', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'song', '');
        log(response);
        expect(response.meta.filterOptions.difficulty).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.lifestyle).toBeDefined();
        expect(response.meta.filterOptions.instrumentless).toBeDefined();
    });

    test('fetchAllFilterOptions-Rudiment', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'rudiment', '');
        log(response);
        expect(response.meta.filterOptions.gear).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.topic).toBeDefined();
    });
    test('fetchAllFilterOptions-PlayAlong', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'play-along', '');
        log(response);
        expect(response.meta.filterOptions.difficulty).toBeDefined();
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.bpm).toBeDefined();
    });

    test('fetchAllFilterOptions-Coaches', async () => {
        let response = await fetchAllFilterOptions('drumeo', [], '', '', 'instructor', '');
        log(response);
        expect(response.meta.filterOptions.focus).toBeDefined();
        expect(response.meta.filterOptions.focus.length).toBeGreaterThan(0);
        expect(response.meta.filterOptions.genre).toBeDefined();
        expect(response.meta.filterOptions.genre.length).toBeGreaterThan(0);
    });

    test('fetchAllFilterOptions-filter-selected', async () => {
        let response = await fetchAllFilterOptions('drumeo', ['theory,notation', 'theory,time signatures', 'creativity,Grooves', 'creativity,Fills & Chops', 'difficulty,Beginner', 'difficulty,Intermediate', 'difficulty,Expert'], '', '', 'course', '');
        log(response);
        expect(response.meta.filterOptions).toBeDefined();
    });
});


describe('MetaData', function () {

    test('customBrandTypeExists', async () => {
        const metaData = processMetadata('guitareo', 'recording');
        expect(metaData.type).toBe('recording');
        expect(metaData.name).toBe('Archives');
        expect(metaData.description).toBeDefined();
    });

    test('invalidContentType', async () => {
        const metaData = processMetadata('guitareo', 'not a real type');
        expect(metaData).toBeNull();
    });

    test('onlyCommon', async () => {
        const guitareoMetaData = processMetadata('guitareo', 'challenge');
        const drumeoMetaData = processMetadata('drumeo', 'challenge');
        guitareoMetaData.url = ''
        drumeoMetaData.url = ''
        expect(guitareoMetaData).toStrictEqual(drumeoMetaData);
        expect(guitareoMetaData.type).toBe('challenge');
        expect(guitareoMetaData.name).toBe('Challenges');
    });

    test('withCommon', async () => {
        const guitareoMetaData = processMetadata('guitareo', 'instructor');
        const drumeoMetaData = processMetadata('drumeo', 'instructor');
        expect(guitareoMetaData.description).not.toBe(drumeoMetaData.description);
        guitareoMetaData.description = ''
        drumeoMetaData.description = ''
        guitareoMetaData.url = ''
        drumeoMetaData.url = ''
        expect(guitareoMetaData).toStrictEqual(drumeoMetaData);
    });

    test('withWithoutFilters', async () => {
        let metaData = processMetadata('singeo', 'student-review', true);
        expect(metaData.type).toBeDefined()
        expect(metaData.name).toBeDefined()
        expect(metaData.description).toBeDefined();
        expect(metaData.thumbnailUrl).toBeDefined();
        expect(metaData.tabs).toBeDefined();
        metaData = processMetadata('singeo', 'student-review', false);
        expect(metaData.type).toBeDefined()
        expect(metaData.name).toBeDefined()
        expect(metaData.description).toBeDefined();
        expect(metaData.tabs).not.toBeDefined();
    });

    test('nulled', async () => {
        let metaData = processMetadata('drumeo', 'student-review');
        expect(metaData).toBeNull();
        metaData = processMetadata('singeo', 'student-review');
        expect(metaData).not.toBeNull();
    });
});
