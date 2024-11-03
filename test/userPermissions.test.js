const railContentModule = require('../src/services/railcontent.js')
const {fetchUserPermissions} = require("../src/services/userPermissions");
const {dataContext} = require("../src/services/contentLikes");

describe('userPermissions', function () {
    let mock = null;
    let testData = "[1,52,72,73,77,78,81]";
    beforeEach(() => {
        mock = jest.spyOn(railContentModule, 'fetchUserPermissions');
        mock.mockImplementation(() => JSON.parse(testData));
    });

    test('fetchUserPermissions', async () => {
        let result = await fetchUserPermissions();
        let result2 = await fetchUserPermissions();

        expect(railContentModule.fetchUserPermissions).toHaveBeenCalledTimes(1);
        expect(result).toBe(testData);
        expect(result).toBe(result2);
    });

});
