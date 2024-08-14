import {initializeService} from '../src/services/config.js';

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
    fetchMethodChildren,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent
} = require('../src/services/sanity.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        const config = { 'sanityConfig':{
            token: process.env.SANITY_API_TOKEN,
            projectId: process.env.SANITY_PROJECT_ID,
            dataset: process.env.SANITY_DATASET,
            useCachedAPI: process.env.SANITY_USE_CACHED_API || true,
            version: '2021-06-07',
            debug: process.env.DEBUG || false
        }};
        initializeService(config);
    });

    test('fetchSongById', async () => {
        const id = 380094;
        const response = await fetchSongById(id);
        expect(response.railcontent_id).toBe(id);

    });

    test('fetchArtists', async () => {
        const response = await fetchArtists('drumeo');
        const artistNames = response.map((x) => x.name);
        expect(artistNames).toContain("Arctic Monkeys");

    });

    test('fetchSongArtistCount', async () => {
        const response = await fetchSongArtistCount('drumeo');
        console.log(response);
        expect(response).toBeGreaterThan(1000);
    });

    test('fetchByRailContentId', async () => {
        const id = 380094;
        const response = await fetchByRailContentId(id);
        expect(response.railcontent_id).toBe(id);
    });

    test('fetchByRailContentIds', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id, id2]);
        const returnedIds = response.map((x) => x.railcontent_id);
        expect(returnedIds).toContain(id);
        expect(returnedIds).toContain(id2);
        expect(returnedIds.length).toBe(2);

    });

    test('fetchLessonContent', async () => {
        const id = 380094;
        const response = await fetchLessonContent(id);
        expect(response.railcontent_id).toBe(id);
    });

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
        expect(response.entity[0].railcontent_id).toBeDefined();
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
    // test('fetchRelatedLessons', async () => {
    //     const id = 380094;
    //     const response = await fetchRelatedLessons(id, 'singeo', 'song');
    //     console.log(response.related_lessons[0]);
    //     expect(response.related_lessons[0]).toBe(id);
    // });
});
