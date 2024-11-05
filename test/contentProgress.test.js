import {
    getProgressPercentage,
    dataContext,
    recordWatchSession,
    getProgressPercentageByIds, getProgressState, getProgressStateByIds
} from "../src/services/contentProgress";
import {initializeTestService} from "./sanityQueryService.test";

const railContentModule = require('../src/services/railcontent.js')

describe('contentProgressDataContext', function () {
    let mock = null;
    const testVersion = 1;

    beforeEach(() => {
        initializeTestService();
        mock = jest.spyOn(dataContext, 'fetchData');
        var json = JSON.parse(`{"version":${testVersion},"data":{"234191":{"s":"started","p":6,"t":20},"233955":{"s":"started","p":1}}}`);
        mock.mockImplementation(() => json);

    });

    test('getProgressPercentage', async () => {
        let result = await getProgressPercentage(234191);
        expect(result).toBe(6);
    });

    test('getProgressPercentageByIds', async () => {
        let result = await getProgressPercentageByIds([234191, 111111]);
        expect(result[234191]).toBe(6);
        expect(result[111111]).toBe(0);
    });

    test('getProgressPercentage_notExists', async () => {
        let result = await getProgressPercentage(111111);
        expect(result).toBe(0);
    });

    test('getProgressState', async () => {
        let result = await getProgressState(234191);
        expect(result).toBe("started");
    });

    test('getProgressStateByIds', async () => {
        let result = await getProgressStateByIds([234191, 120402]);
        expect(result[234191]).toBe("started");
        expect(result[120402]).toBe("");
    });

    test('progressBubbling', async () => {
        let mock2 = jest.spyOn(railContentModule, 'postRecordWatchSession');
        let serverVersion = 2;
        mock2.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`));
        let progress = await getProgressPercentage(241250); //force load context

        let result = await recordWatchSession({watchPositionSeconds: 50, totalDurationSeconds: 100, contentId: 241250});
        serverVersion++;
        await recordWatchSession({watchPositionSeconds: 50, totalDurationSeconds: 100, contentId: 241251});
        serverVersion++;
        await recordWatchSession({watchPositionSeconds: 50, totalDurationSeconds: 100, contentId: 241252});
        serverVersion++;
        await recordWatchSession({watchPositionSeconds: 100, totalDurationSeconds: 100, contentId: 241260});
        serverVersion++;
        await recordWatchSession({watchPositionSeconds: 100, totalDurationSeconds: 100, contentId: 241261});
        serverVersion++;
        progress = await getProgressPercentage(241250); //force load context

        expect(progress).toBe(50);
        let progress241249 = await getProgressPercentage(241249);
        expect(progress241249).toBe(15);
        let progress241248 = await getProgressPercentage(241248);
        expect(progress241248).toBe(7);
        let progress241247 = await getProgressPercentage(241247);
        expect(progress241247).toBe(1);

    });

});
