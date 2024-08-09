const {fetchSongById, fetchArtists, fetchByRailContentId, fetchByRailContentIds} = require('../src/index.js');

describe('Sanity Queries', function () {
    test('fetchSongById', async () => {
        const test = await fetchSongById(380094);
    });

    test('fetchArtists', async () => {
        const test = await fetchArtists('drumeo');
    });

    test('fetchByRailContentId', async () => {
        const id = 380094;
        const response = await fetchByRailContentId(id);
        expect(response[0].railcontent_id).toBe(id);
    });

    test('fetchByRailContentIds', async () => {
        const id = 380094;
        const id2 = 402204;
        const response = await fetchByRailContentIds([id, id2]);
        const returnedIds = response.map((x)=> x.railcontent_id);
        expect(returnedIds).toContain(id);
        expect(returnedIds).toContain(id2);
        expect(returnedIds.length).toBe(2);

    });
});
