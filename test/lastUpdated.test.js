const {setLastUpdatedTime, wasLastUpdateOlderThanXSeconds} = require("../src/services/lastUpdated");
const {initializeTestService} = require("./initializeTests");

describe('lastUpdated', function () {

    beforeEach(() => {
        initializeTestService();
    });

    test('lastUpdated', async () => {
        setLastUpdatedTime("testKey");
        let test1 = wasLastUpdateOlderThanXSeconds(1, "testKey");
        await new Promise((r) => setTimeout(r, 800));
        let test2 = wasLastUpdateOlderThanXSeconds(1, "testKey");
        await new Promise((r) => setTimeout(r, 500));
        let test3 = wasLastUpdateOlderThanXSeconds(1, "testKey");

        expect(test1).toEqual(false);
        expect(test2).toEqual(false);
        expect(test3).toEqual(true);
    });
});
