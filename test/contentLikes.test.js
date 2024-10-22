import {isContentLiked, dataContext, likeContent, unlikeContent} from "../src/services/contentLikes";
import {LocalStorageMock} from "./localStorageMock";
import {initializeService} from "../src";

const railContentModule = require('../src/services/railcontent.js')

describe('commentLikesDataContext', function () {
    let mock = null;
    const testVersion = 1;

    beforeEach(() => {
        initializeService({localStorage: new LocalStorageMock(), isMA: false});
        mock = jest.spyOn(dataContext, 'fetchData');
        var json = JSON.parse(`{"version":${testVersion},"data":[308516,308515,308514,308518]}`);
        mock.mockImplementation(() => json);
    });

    test('contentLiked', async () => {
        let result = await isContentLiked(308516);
        expect(result).toBe(true);
    });

    test('contentNotLiked', async () => {
        let result = await isContentLiked(121111);
        expect(result).toBe(false);
    });

    test('ensureOnlyOneServerFetchRequest', async () => {
        dataContext.clearCache();
        await isContentLiked(308516);
        await isContentLiked(308514);
        await isContentLiked(121111);
        expect(dataContext.fetchData).toHaveBeenCalledTimes(1);
    });

    test('ensureDataPulledFromLocalCache', async () => {
        dataContext.clearCache();
        await isContentLiked(308516);
        dataContext.clearContext();
        await isContentLiked(308514);
        expect(dataContext.fetchData).toHaveBeenCalledTimes(1);
    });

    test('likeContent', async () => {
        mock = jest.spyOn(railContentModule, 'postContentLiked');
        var json = JSON.parse(`{"version":${testVersion + 1}}`);
        mock.mockImplementation(() => json);

        dataContext.clearCache();
        let isLiked = await isContentLiked(111111);
        expect(isLiked).toBe(false);

        await likeContent(111111);
        isLiked = await isContentLiked(111111);
        expect(isLiked).toBe(true);

        dataContext.clearContext();
        isLiked = await isContentLiked(111111);
        expect(isLiked).toBe(true);

        expect(dataContext.version()).toBe(testVersion + 1);
    });


    test('unlikeContent', async () => {
        mock = jest.spyOn(railContentModule, 'postContentUnliked');
        var json = JSON.parse(`{"version":${testVersion + 1}}`);
        mock.mockImplementation(() => json);

        dataContext.clearCache();
        let isLiked = await isContentLiked(308516);
        expect(isLiked).toBe(true);

        await unlikeContent(308516);
        console.log(dataContext.context);
        isLiked = await isContentLiked(308516);
        expect(isLiked).toBe(false);

        dataContext.clearContext();
        isLiked = await isContentLiked(308516);
        expect(isLiked).toBe(false);

        expect(dataContext.version()).toBe(testVersion + 1);
    });

});
