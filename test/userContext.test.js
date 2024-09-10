const railContentModule = require('../src/services/railcontent.js')
const userContextModule = require('../src/services/userContext.js');
import {LocalStorageMock} from "./localStorageMock";

describe('userContext', function () {
    let mock = null;
    const testHash = "1f77be72a539306b64d29e2b8cc07e34";
    beforeEach(() => {
        userContextModule.init(new LocalStorageMock());
        mock = jest.spyOn(railContentModule, 'fetchUserContext');
        var json = `{"hash":"${testHash}","data":{"308516":{"p":100},"308515":{"p":100},"308514":{"p":13},"308518":{"p":100}}}`;
        mock.mockImplementation(() => json);
    });

    test('contentExists', async () => {
        let contentData = await userContextModule.fetchContentData(testHash, 308516);
        expect(contentData.p).toBeDefined();
    });

    test('contentDoesNotExist', async () => {
        //fetch content that does not exist
        let contentData = await userContextModule.fetchContentData(testHash, 121111);
        expect(contentData).toBeUndefined();
    });

    test('ensureOnlyOneServerFetchRequest', async () => {
        userContextModule.clearCache();
        await userContextModule.fetchContentData(testHash, 308516);
        await userContextModule.fetchContentData(testHash, 308514);
        expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(1);
    });

    test('ensureDataPulledFromLocalCache', async () => {
        userContextModule.clearCache();
        await userContextModule.fetchContentData(testHash, 308516);
        userContextModule.testClearLocal();
        await userContextModule.fetchContentData(testHash, 308514);
        expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(1);
    });

    test('hashExpiration', async () => {
        userContextModule.clearCache();
        await userContextModule.fetchContentData(testHash, 308516);
        let newHash = "8g9qg5wn3e5s5oi69q6g22et9w6g34t5";
        await userContextModule.fetchContentData(newHash, 308516);
        expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(2);
    });


});
