const {
    initializeProgressModule,
    fetchSongsInProgress
} = require('../src/progress.js');

let token = '';
let userId = process.env.MUSORA_BASE_URL;
let baseURL = process.env.MUSORA_BASE_URL;
let email = process.env.MUSORA_TEST_ACCOUNT;
let password = process.env.MUSORA_TEST_PASSWORD;

async function getToken() {
    if (!token) {
        const url = `${baseURL}/user-management-system/login/token`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const data = {
            email: email,
            password: password,
            device_name: 'test'
        };
        const response = await fetch(url, {method: "POST", body: JSON.stringify(data), headers});
        const result = await response.json();
        token = result.token;
    }
    return token;
}


describe('Progress', function () {
    beforeEach(async () => {
        token = await getToken();
        const config = {
            token: token,
            baseURL: process.env.MUSORA_BASE_URL,
            debug: process.env.DEBUG || false
        };
        initializeProgressModule(config);
    });

    test('fetchSongsInProgress', async () => {
        const userId = 519690;
        const response = await fetchSongsInProgress(userId, 'drumeo');
        expect(response.railcontent_id).toBe(userId);

    });
});
