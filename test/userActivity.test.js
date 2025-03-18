import { initializeTestService } from './initializeTests.js'
import {getUserMonthlyStats, getUserWeeklyStats, userActivityContext} from '../src/services/userActivity.js'

global.fetch = jest.fn()
let mock = null
const testVersion = 1
const DEBUG = false

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

    // Assert that dailyActiveStats contains correct data
    const dailyStats = practices.dailyActiveStats
    const currentDate = new Date()
    const currentDateString = currentDate.toISOString().split('T')[0]
    expect(dailyStats).toHaveLength(31)

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
    const practices = await getUserMonthlyStats( 2025, 1)
    consoleLog(practices)

    // Assert that dailyActiveStats contains correct data
    const dailyStats = practices.dailyActiveStats
    const feb10 = dailyStats.find(stat => stat.label === '2025-02-10')
    expect(feb10.inStreak).toBe(true)
    expect(feb10.type).toBe('tracked')
    expect(feb10.isActive).toBe(false)
  })

  test('fetches user practices for current week', async () => {
    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    const dailyStats = practices.dailyActiveStats
    const monday = dailyStats.find(stat => stat.label === 'M')
    expect(monday).toBeDefined
    const tuesday = dailyStats.find(stat => stat.label === 'T')
    expect(tuesday).toBeDefined
  })

  function consoleLog(message, object=null, debug=false) {
    if (debug || DEBUG) {
      console.log(message, object);
    }
  }
})
