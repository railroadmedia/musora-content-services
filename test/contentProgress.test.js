import {getProgressPercentage, dataContext} from "../src/services/contentProgress";
import {LocalStorageMock} from "./localStorageMock";
import {initializeService} from "../src";

const railContentModule = require('../src/services/railcontent.js')

describe('contentProgressDataContext', function () {
    let mock = null;
    const testVersion = 1;

    beforeEach(() => {
        initializeService({localStorage: new LocalStorageMock()});
        mock = jest.spyOn(dataContext, 'fetchData');
        var json = JSON.parse(`{"version":${testVersion},"data":{"234191":{"s":"started","p":6,"t":20},"233955":{"s":"started","p":1}}}`);
        mock.mockImplementation(() => json);
    });

    test('getProgressPercentage', async () => {
        let result = await getProgressPercentage(234191);
        expect(result).toBe(6);
    });

    test('getProgressPercentage_notExists', async () => {
        let result = await getProgressPercentage(111111);
        expect(result).toBe(0);
    });

});
