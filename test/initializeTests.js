import {initializeService} from '../src';
import {LocalStorageMock} from "./localStorageMock";
const railContentModule = require('../src/services/railcontent.js')

export function initializeTestService() {
    const config = {
        sanityConfig: {
            token: process.env.SANITY_API_TOKEN,
            projectId: process.env.SANITY_PROJECT_ID,
            dataset: process.env.SANITY_DATASET,
            useCachedAPI: process.env.SANITY_USE_CACHED_API === 'true' || true,
            version: '2021-06-07',
            debug: process.env.DEBUG === 'true' || false,
            useDummyRailContentMethods: true,
        },
        localStorage: new LocalStorageMock()
    };
    initializeService(config);

    let mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData');
    let testData = {"permissions": [78, 91, 92], "isAdmin": false};
    mock.mockImplementation(() => testData);
}