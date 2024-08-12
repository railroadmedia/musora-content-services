const {
    initializeSanityService,
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
} = require('../src/index.js');

describe('Sanity Queries', function () {
    beforeEach(() => {
        const config = {
            token: process.env.SANITY_API_TOKEN,
            projectId: process.env.SANITY_PROJECT_ID,
            dataset: process.env.SANITY_DATASET,
            useCachedAPI: process.env.SANITY_USE_CACHED_API || true,
            version: '2021-06-07',
            debug: process.env.DEBUG || false
        };
        initializeSanityService(config);
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

    // test('fetchRelatedLessons', async () => {
    //     const id = 380094;
    //     const response = await fetchRelatedLessons(id, 'singeo', 'song');
    //     console.log(response.related_lessons[0]);
    //     expect(response.related_lessons[0]).toBe(id);
    // });
});
