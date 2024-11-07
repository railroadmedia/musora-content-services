const {fetchUserPermissions} = require("../src/services/userPermissions");
const {initializeTestService} = require("./initializeTests");

describe('userPermissions', function () {
    beforeEach(() => {
       initializeTestService();
    });

    test('fetchUserPermissions', async () => {
        let result = await fetchUserPermissions(); //fetch from server
        let result2 = await fetchUserPermissions(); //fetch locally

        //This breaks when running tests in parallel
        //expect(railContentModule.fetchUserPermissionsData).toHaveBeenCalledTimes(1);
        expect(result.permissions).toStrictEqual([78,91,92]);
        expect(result.isAdmin).toStrictEqual(false);
        expect(result).toBe(result2);
    });
});
