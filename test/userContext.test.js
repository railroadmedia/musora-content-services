const railContentModule = require('../src/services/railcontent.js')
const userContextModule = require('../src/services/userContext.js');
import {LocalStorageMock} from "./localStorageMock";

describe('userContext', function () {
    let mock = null;
    const testVersion = 1;
    beforeEach(() => {
        userContextModule.init(new LocalStorageMock());
        mock = jest.spyOn(railContentModule, 'fetchUserContext');
        var json = `{"version":${testVersion},"data":{"308516":{"l":1},"308515":{"p":100},"308514":{"p":13},"308518":{"p":100}}}`;
        mock.mockImplementation(() => json);
    });

    test('contentLiked', async () => {
        let contentData = await userContextModule.fetchContentData(308516);
        expect(contentData.liked).toBe(1);
    });

    test('contentDoesNotExist', async () => {
        //fetch content that does not exist
        let contentData = await userContextModule.fetchContentData(121111);
        expect(contentData.liked).toBe(0);
    });

    test('ensureOnlyOneServerFetchRequest', async () => {
        userContextModule.clearCache();
        await userContextModule.fetchContentData(308516);
        await userContextModule.fetchContentData(308514);
        expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(1);
    });

    test('ensureDataPulledFromLocalCache', async () => {
        userContextModule.clearCache();
        await userContextModule.fetchContentData(308516);
        userContextModule.testClearLocal();
        await userContextModule.fetchContentData(308514);
        expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(1);
    });

    // test('hashExpiration', async () => {
    //     userContextModule.clearCache();
    //     await userContextModule.fetchContentData(testHash308516);
    //     let newHash = "8g9qg5wn3e5s5oi69q6g22et9w6g34t5";
    //     await userContextModule.fetchContentData(newHash, 308516);
    //     expect(railContentModule.fetchUserContext).toHaveBeenCalledTimes(2);
    // });

    test('likeContent', async () => {
        mock = jest.spyOn(railContentModule, 'fetchLikeContent');
        var json = JSON.parse(`{"version":${testVersion + 1}}`);
        mock.mockImplementation(() => json);

        userContextModule.clearCache();
        await userContextModule.fetchContentData(308515);
        await userContextModule.likeContent(308515);
        let contentData = await userContextModule.fetchContentData(308515);
        expect(contentData.liked).toBe(1);

        userContextModule.testClearLocal();
        contentData = await userContextModule.fetchContentData(308515);
        expect(contentData.liked).toBe(1);

        expect(userContextModule.version()).toBe(testVersion + 1);
    });


    test('unlikeContent', async () => {
        mock = jest.spyOn(railContentModule, 'fetchUnlikeContent');
        var json = JSON.parse(`{"version":${testVersion + 1}}`);
        mock.mockImplementation(() => json);

        userContextModule.clearCache();
        await userContextModule.fetchContentData(308516);
        await userContextModule.unlikeContent(308516);
        let contentData = await userContextModule.fetchContentData(308516);
        expect(contentData.liked).toBe(0);

        userContextModule.testClearLocal();
        contentData = await userContextModule.fetchContentData(308516);
        expect(contentData.liked).toBe(0);

        expect(userContextModule.version()).toBe(testVersion + 1);
    });

});
