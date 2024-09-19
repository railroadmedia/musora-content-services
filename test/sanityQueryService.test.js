import {initializeService} from '../src/services/config.js';
import {getFieldsForContentType} from "../src/contentTypeConfig";
import {fetchSanity} from "../src/services/sanity";

const {
    fetchSongById,
    fetchArtists,
    fetchSongArtistCount,
    fetchRelatedSongs,
    fetchAllSongs,
    fetchSongFilterOptions,
    fetchSongCount,
    fetchWorkouts,
    fetchNewReleases,
    fetchUpcomingEvents,
    fetchByRailContentId,
    fetchByRailContentIds,
    fetchAll,
    fetchAllFilterOptions,
    fetchMethodNextLesson,
    fetchMethodChildrenIds,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent,
    getSortOrder,
    fetchParentByRailContentId,
    fetchChildren,
    fetchMethod,
    fetchMethods,
    fetchFoundation,
    fetchAllPacks,
    fetchPacksAll,
    fetchCoachLessons,
    fetchByReference,
    fetchScheduledReleases
} = require('../src/services/sanity.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        const config = {
            sanityConfig: {
                token: process.env.SANITY_API_TOKEN,
                projectId: process.env.SANITY_PROJECT_ID,
                dataset: process.env.SANITY_DATASET,
                useCachedAPI: process.env.SANITY_USE_CACHED_API === 'true' || true,
                version: '2021-06-07',
                debug: process.env.DEBUG === 'true' || false
            }
        };
        initializeService(config);
    });

    test('fetchSongById', async () => {
        const id = 380094;
        const response = await fetchSongById(id);
        expect(response.id).toBe(id);

    });


    test('fetchArtists', async () => {
        const response = await fetchArtists('drumeo');
        const artistNames = response.map((x) => x.name);
        expect(artistNames).toContain("Arctic Monkeys");

    }, 10000);

    test('fetchSongArtistCount', async () => {
        const response = await fetchSongArtistCount('drumeo');
        // console.log(response);
        expect(response).toBeGreaterThan(1000);
    });

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
        const response = await fetchSanity(query, false, postProcess);
        //console.log(response);
        expect(response.id).toBe(id);
        expect(response.new_field).toBe(newField);
        expect(response.slug).toBe(newSlug);
    });


    test('fetchSanityPostProcess', async () => {
        const id = 380094;
        const response = await fetchSongById(id);
        expect(response.id).toBe(id);

    });

    test('fetchByRailContentIds', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id, id2]);
        const returnedIds = response.map((x) => x.id);
        expect(returnedIds).toContain(id);
        expect(returnedIds).toContain(id2);
        expect(returnedIds.length).toBe(2);

    });

    test('fetchLessonContent', async () => {
        const id = 380094;
        const response = await fetchLessonContent(id);
        expect(response.id).toBe(id);
    });

    test('fetchAllSongs', async () => {
        const response = await fetchAllSongs('drumeo', {});
        // console.log(response);
        expect(response.entity[0].soundslice).toBeDefined();
        expect(response.entity[0].artist_name).toBeDefined();
        expect(response.entity[0].instrumentless).toBeDefined();
    });

    test('fetchAllSongsGroupByArtist', async () => {
        const response = await fetchAllSongs('drumeo', {groupBy:"artist"});
        expect(response.entity[0].lessons[0].soundslice).toBeDefined();
        expect(response.entity[0].lessons[0].artist_name).toBeDefined();
        expect(response.entity[0].lessons[0].instrumentless).toBeDefined();
    }, 100000);


    test('fetchAllWorkouts', async () => {
        const response = await fetchAll('drumeo', 'workout',{});
        // console.log(response);
        expect(response.entity[0].id).toBeDefined();
    });

    test('fetchAllInstructorField', async () => {
        const response = await fetchAll('drumeo', 'quick-tips',{searchTerm: 'Domino Santantonio'});
        // console.log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].instructors).toBeTruthy();
    });

    test('fetchAllSortField', async () => {
        const response = await fetchAll('drumeo', 'rhythmic-adventures-of-captain-carson',{});
        // console.log(response);
        expect(response.entity[0].id).toBeDefined();
        expect(response.entity[0].sort).toBeDefined();
    });


    test('fetchAllChallenges', async () => {
        const response = await fetchAll('drumeo', 'challenge',{});
        // console.log(response);
        expect(response.entity[0].registration_url).toBeDefined();
        expect(response.entity[0].enrollment_start_time).toBeDefined();
        expect(response.entity[0].enrollment_end_time).toBeDefined();

        expect(response.entity[0].lesson_count).toBeDefined();
        expect(response.entity[0].primary_cta_text).toBeDefined();
        expect(response.entity[0].challenge_state).toBeDefined();
        expect(response.entity[0].challenge_state_text).toBeDefined();

    });

    test('fetchAll-CustomFields', async () => {
        let response = await fetchAll('drumeo', 'challenge',{customFields:['garbage']});
        // console.log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect(response.entity[0].id).toBeDefined();

        response = await fetchAll('drumeo', 'challenge',{useDefaultFields: false, customFields:['garbage']});
        // console.log(response);
        expect(response.entity[0].garbage).toBeDefined();
        expect.not.objectContaining(response.entity[0].id);
    });

    test('fetchRelatedLessons', async () => {
        const id = 380094;
        const document = await fetchByRailContentId(id);
        let artist = document.artist.name;
        const response = await fetchRelatedLessons(id, 'singeo');
        let relatedDoc = await fetchByRailContentId(response.related_lessons[0].id);
        // match on artist or any genre
        let isMatch = artist === relatedDoc.artist.name;
        isMatch = isMatch || document.genre.some((genre) => {
            return relatedDoc.genre.some((relatedGenre) => {
                return genre._ref === relatedGenre._ref;
            });
        });
        expect(isMatch).toBeTruthy();
    });

    test('fetchChildren', async () => {
        // complement test to fetchParentByRailContentId
        const id = 191338; ////https://web-staging-one.musora.com/admin/studio/publishing/structure/play-along;play-along_191338
        const expectedChildID = 191492;
        const response = await fetchChildren(id);
        // console.log('num children', response.length);
        // console.log(response);
        
        expect(response.length > 0).toBeTruthy();
        const foundExpectedChild = response.some((child) => {
            return child['id'] = expectedChildID; 
        });
        expect(foundExpectedChild).toBeTruthy();
    });

    test('fetchParentByRailContentId', async () => {
        // complement test to fetchChildren
        const childId = 191492; // child of https://web-staging-one.musora.com/admin/studio/publishing/structure/play-along;play-along_191338
        const expectedParent = 191338;
        const response = await fetchParentByRailContentId(childId);
        expect(response['id']).toBe(expectedParent);
    });

    test('getSortOrder',  () => {
        let sort = getSortOrder()
        expect(sort).toBe('published_on desc');
        sort = getSortOrder('slug')
        expect(sort).toBe('title asc');
        sort = getSortOrder('-slug')
        expect(sort).toBe('title desc');
        sort = getSortOrder('-slug', true)
        expect(sort).toBe('name desc');
        sort = getSortOrder('published-on')
        expect(sort).toBe('published_on asc');
    });

    test('fetchMethod', async () => {
        const response = await fetchMethod('drumeo', 'drumeo-method');
        //console.log(response);
        expect(response).toBeDefined();
        expect(response.levels.length).toBeGreaterThan(0);
    });

    test('fetchMethods', async () => {
        const response = await fetchMethods('drumeo');
        // console.log(response);
        expect(response.length).toBeGreaterThan(0);
        expect(response[0].type).toBe('learning-path');
    });

    test('fetchAll-WithProgress', async () => {
        const ids = [410213, 305649];
        let response = await fetchAll('drumeo', 'song', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(2);
        expect(response.entity[0].id = 305649);
        expect(response.entity[1].id = 410213);
        // change the type and we expect no results
        response = await fetchAll('drumeo', 'quick-tip', {
            sort: 'slug',
            progressIds: ids,
        });
        expect(response.entity.length).toBe(0);
    });

    test('fetchAllFilterOptions-WithProgress', async () => {
        const ids = [410213, 305649];
        let response = await fetchAllFilterOptions('drumeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(2);
        // change the brand and we expect no results
        response = await fetchAllFilterOptions('singeo', '', '', '', 'song', '', ids);
        expect(response.meta.totalResults).toBe(0);

    });

    test('fetchFoundation', async () => {
        const response = await fetchFoundation('foundations-2019');
        //  console.log(response);
        expect(response.units.length).toBeGreaterThan(0);
        expect(response.type).toBe('foundation');
    });

    test('fetchPackAll', async () => {
        const response = await fetchPackAll(212899); //https://web-staging-one.musora.com/admin/studio/publishing/structure/pack;pack_212899%2Cinspect%3Don
        // console.log(response);
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
        const response = await fetchCoachLessons('drumeo',233797);
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchAll-IncludedFields', async () => {
        let response = await fetchAll('drumeo', 'instructor',{includedFields: ['is_active']});
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchByReference', async () => {
        const response = await fetchByReference('drumeo', { includedFields: ['is_featured'] });
        expect(response.entity.length).toBeGreaterThan(0);
    });

    test('fetchScheduledReleases', async () => {
        const response = await fetchScheduledReleases('drumeo', {});
        expect(response.length).toBeGreaterThan(0);
    });
});
