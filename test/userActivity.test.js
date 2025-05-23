import { initializeTestService } from './initializeTests.js'
import {getUserMonthlyStats, getUserWeeklyStats, userActivityContext, recordUserPractice} from '../src/services/userActivity.js'
import {fetchByRailContentIds} from "../src";
import mockData_fetchByRailContentIds_one_content from './mockData/mockData_fetchByRailContentIds_one_content.json';

global.fetch = jest.fn()
let mock = null
const testVersion = 1
const DEBUG = true

jest.mock('../src/services/railcontent', () => ({
  ...jest.requireActual('../src/services/railcontent'),
  logUserPractice: jest.fn(() => Promise.resolve()),
  fetchUserPermissionsData: jest.fn(() => ({ permissions: [78, 91, 92], isAdmin: false }))
}))

jest.mock('../src/services/sanity', () => ({
  ...jest.requireActual('../src/services/sanity'),
  fetchByRailContentIds: jest.fn(() => Promise.resolve(mockData_fetchByRailContentIds_one_content)),
}))
describe('User Activity API Tests', function () {
  beforeEach(() => {
    initializeTestService()
    mock = jest.spyOn(userActivityContext, 'fetchData')
    var json = JSON.parse(
      `{
      "version": ${testVersion},
      "config": { "key": 1, "enabled": 1, "checkInterval": 1, "refreshInterval": 2 },
      "data": {
          "practices": {
           "2025-02-10": [{ "duration_seconds": 190 }],
             "2025-02-11": [{ "duration_seconds": 340 }],
             "2025-02-19": [{ "duration_seconds": 340 }],
             "2025-03-01": [{ "duration_seconds": 360 }],
             "2025-03-03": [{ "duration_seconds": 360 }],
             "2025-03-05": [{ "duration_seconds": 100 }],
             "2025-03-11": [{ "duration_seconds": 190 }],
            "2025-03-14": [{ "duration_seconds": 456 }],
            "2025-03-15": [{ "duration_seconds": 124 }],
            "2025-03-16": [{ "duration_seconds": 452 }, { "duration_seconds": 456 }],
            "2025-03-17": [{ "duration_seconds": 122 }]
          }
        }
    }`
    )
    mock.mockImplementation(() => json)
    userActivityContext.ensureLocalContextLoaded()
  })

  test('fetches user practices successfully', async () => {
    userActivityContext.clearCache()
    const practices = await getUserMonthlyStats()
    consoleLog(practices)
    // Assert that dailyActiveStats contains correct data
    const dailyStats = practices.data.dailyActiveStats
    const currentDate = new Date()
    const currentDateString = currentDate.toISOString().split('T')[0]

    // Verify current day's stats (e.g., March 17, 2025)
    const current = dailyStats.find(stat => stat.label === currentDateString)
    expect(current).toBeTruthy()
    expect(current.isActive).toBe(true)
    expect(current.type).toBe('active')
    expect(current.inStreak).toBe(false)

    // Ensure that mock was called as expected
    expect(mock).toHaveBeenCalledTimes(1)
  })

  test('fetches user practices from past', async () => {
    userActivityContext.clearCache()
    const practices = await getUserMonthlyStats( {year:2025, month: 1} )
    consoleLog(practices.data.dailyActiveStats)

    // Assert that dailyActiveStats contains correct data
    const dailyStats = practices.data.dailyActiveStats
    const feb10 = dailyStats.find(stat => stat.label === '2025-02-10')
    expect(feb10.inStreak).toBe(true)
     expect(feb10.type).toBe('tracked')
     expect(feb10.isActive).toBe(false)
  })

  test('fetches user practices for current week', async () => {
    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    const dailyStats = practices.data.dailyActiveStats
    const monday = dailyStats.find(stat => stat.label === 'M')
    expect(monday).toBeDefined
    const tuesday = dailyStats.find(stat => stat.label === 'T')
    expect(tuesday).toBeDefined
  })

  test('should add a new practice entry and call logUserPractice', async () => {
    userActivityContext.clearCache()
    const mockPractice = {
      duration_seconds: 300,
      content_id: 415183
    }

    jest.spyOn(userActivityContext, 'update').mockImplementation(async (callback) => {
      await callback(userActivityContext)
    })

    await recordUserPractice(mockPractice)

    expect(userActivityContext.update).toHaveBeenCalledTimes(1)
  })

  function consoleLog(message, object=null, debug=false) {
    if (debug || DEBUG) {
      console.log(message, object);
    }
  }
})


