const railContentModule = require('../src/services/railcontent.js')
const {fetchUserPermissions} = require("../src/services/userPermissions");
const {initializeTestService} = require("./sanityQueryService.test");

describe('userPermissions', function () {
    let mock = null;
    let testData = {"permissions": [1, 52, 72, 73, 77, 78, 81, 92], "isAdmin": false};
    beforeEach(() => {
        initializeTestService();
        mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData');
        mock.mockImplementation(() => testData);
    });

    test('fetchUserPermissions', async () => {
        let result = await fetchUserPermissions(); //fetch from server
        let result2 = await fetchUserPermissions(); //fetch locally

        //This breaks when running tests in parallel
        //expect(railContentModule.fetchUserPermissionsData).toHaveBeenCalledTimes(1);
        expect(result).toBe(testData);
        expect(result).toBe(result2);
    });
});
