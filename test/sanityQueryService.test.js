import {globalConfig, initializeService, runSanityQuery} from '../src/services/config.js';

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
    fetchParentByRailContentId,
    fetchChildren,
    fetchMethod,
    fetchMethods,
    getCurrentRequiredContentPermissionsQueryString,
    getFilterString,
} = require('../src/services/sanity.js');

const {
    FilterBuilder,
} = require('../src/filterBuilder.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        const config = { 
            sanityConfig: {
                token: process.env.SANITY_API_TOKEN,
                projectId: process.env.SANITY_PROJECT_ID,
                dataset: process.env.SANITY_DATASET,
                useCachedAPI: process.env.SANITY_USE_CACHED_API || true,
                apiVersion: '2021-06-07',
                debug: process.env.DEBUG || false,
                useCdn: false
            },
            railcontentConfig: {},
        };
        initializeService(config);
    });

    test('fetchSongById', async () => {
        const id = 406895;
        const response = await fetchSongById(id);
        console.log(response);
        expect(response.id).toBe(id);
    });

    test('fetchArtists', async () => {
        const response = await fetchArtists('drumeo');
        const artistNames = response.map((x) => x.name);

        expect(artistNames).toContain("Arctic Monkeys");

    });

    test('fetchSongArtistCount', async () => {
        const response = await fetchSongArtistCount('drumeo');
        expect(response).toBeGreaterThan(1000);
    });

    test('fetchSongCount', async () => {
        const response = await fetchSongCount('drumeo');
        console.log(response);
        expect(response).toBeGreaterThan(1000);
    });

    test('fetchRelatedSongs', async () => {
        const id = 406895;
        const song = await fetchSongById(id);
        const response = await fetchRelatedSongs('drumeo', song.artist.name, song.genre[0]);
        expect(response).toHaveLength(10);
        expect(JSON.stringify(response)).toContain("Metal");
    });

    test('fetchByRailContentId', async () => {
        const id = 380094;
        const response = await fetchByRailContentId(id);
        console.log(response);
        expect(response.id).toBe(id);
    });

    test('fetchByRailContentIds', async () => {
        const id = 406895;
        const id2 = 380094;
        const response = await fetchByRailContentIds([id, id2]);
        console.log(response);
        const returnedIds = response.map((x) => x.id);
        expect(returnedIds).toContain(id);
        expect(returnedIds).toContain(id2);
        expect(returnedIds.length).toBe(2);

    });

    // TODO?
    // no longer supported?
    // test('fetchLessonContent', async () => {
    //     const id = 380094;
    //     const response = await fetchLessonContent(id);
    //     expect(response.id).toBe(id);
    // });

    test('fetchAllSongs', async () => {
        const response = await fetchAllSongs('drumeo', {});
        console.log(response);
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
        console.log(response);
        expect(response.entity[0].id).toBeDefined();
    });

    test('fetchAllChallenges', async () => {
        const response = await fetchAll('drumeo', 'challenge',{});
        console.log(response);
        expect(response.entity[0].registration_url).toBeDefined();
        expect(response.entity[0].enrollment_start_time).toBeDefined();
        expect(response.entity[0].enrollment_end_time).toBeDefined();

        expect(response.entity[0].lesson_count).toBeDefined();
        expect(response.entity[0].primary_cta_text).toBeDefined();
        expect(response.entity[0].challenge_state).toBeDefined();
        expect(response.entity[0].challenge_state_text).toBeDefined();

    });

    test('fetchRelatedLessons', async () => {
        const id = 380094;
        const document = await fetchByRailContentId(id);
        let artist = document.artist.name;
        const response = await fetchRelatedLessons(id, 'singeo', 'song');
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
        console.log('num children', response.length);
        console.log(response);
        
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

        expect(response).toBeDefined();
        expect(response.levels.length).toBeGreaterThan(0);
    });

    test('fetchMethods', async () => {
        const response = await fetchMethods('drumeo');
        expect(response.length).toBeGreaterThan(0);
        expect(response[0].type).toBe('learning-path');
    });

    test('getCurrentRequiredQueryContentPermissionsString', async () => {
        const response = getCurrentRequiredContentPermissionsQueryString(['my-permission-1', 'my-permission-2'], true);

        expect(response).toBe(' && references(*[_type == "permission" && _id in ["my-permission-1","my-permission-2"]]._id)');
    });

    test('getFilterString', async () => {
        const response = getFilterString(['my-permission-1', 'my-permission-2']);

        expect(response).toBe('test');
    });
});

describe('Filter Builder', function () {

    test('baseConstructor', async () => {
        const filter = 'railcontent_id = 111'
        const builder = new FilterBuilder(filter);
        const finalFilter = builder.buildFilter(filter);
        const clauses = spliceFilterUnsafe(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('published_on');
    });

    test('withOnlyFilterAvailableStatuses', async () => {
        const filter = 'railcontent_id = 111'
        const builder =  FilterBuilder.withOnlyFilterAvailableStatuses(filter,['published', 'unlisted']);
        const finalFilter = builder.buildFilter();
        const clauses = spliceFilterUnsafe(finalFilter);
        expect(clauses[0].phrase).toBe(filter);
        expect(clauses[1].field).toBe('status');
        expect(clauses[1].operator).toBe('in');
        // not sure I like this
        expect(clauses[1].condition).toBe("[\"published\",\"unlisted\"]");
        expect(clauses[2].field).toBe('published_on');
    });

    function spliceFilterUnsafe(filter) {
        // this will break for more complicated filters
        let phrases = filter.split(' && ');
        let clauses= [];
        phrases.forEach((phrase) => {
            const  field = phrase.substring(0, phrase.indexOf(' '));
            const temp = phrase.substring(phrase.indexOf(' ') + 1);
            const operator = temp.substring(0, temp.indexOf(' '));
            const condition = temp.substring(temp.indexOf(' ') + 1);
            clauses.push({phrase, field, operator, condition});
        });
        return clauses;
    }

});