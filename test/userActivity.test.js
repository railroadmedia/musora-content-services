import { initializeTestService } from './initializeTests.js'
import {getUserMonthlyStats, getUserWeeklyStats, userActivityContext, recordUserPractice, getUserPractices} from '../src/services/userActivity.js'
import { logUserPractice } from '../src/services/railcontent.js'
import {fetchByRailContentIds} from "../src";
import mockData_fetchByRailContentIds_one_content from './mockData/mockData_fetchByRailContentIds_one_content.json';
import fs from 'fs';
import path from 'path';

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
    const practices = await getUserMonthlyStats( 2025, 1)
    consoleLog(practices)

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

  test('streak message example 1 - day 1 -not started content', async () => {
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Start your streak by taking any lesson!')
  })

  test('streak message example 1 - day 1 - started content', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedData = today.toISOString().split('T')[0];
    const activeDays = [
      { date: [formattedData], duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message example 1 - day 2 - not started content', async () => {
    const fixedDate = new Date('2025-03-25T12:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData = yesterday.toISOString().split('T')[0];
    const activeDays = [
      { date: [formattedData], duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 day streak! Keep it going with any lesson or song.')
  })

  test('streak message example 1 - day 2 - started content', async () => {
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedData2 = today.toISOString().split('T')[0];

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData1], duration_seconds: 20 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message example 1 - day 3 - not started content', async () => {
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    const activeDays = [
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 20 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message example 1 - day 3 - started content', async () => {
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedData3 = today.toISOString().split('T')[0];

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    const activeDays = [
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 20 },
      { date: [formattedData3], duration_seconds: 20 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 3 day streak. Way to keep it going!')
  })

  test('streak message example 1 - day 4 - not started content', async () => {
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 20 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 day streak! Keep it going with any lesson or song.')
  })

  test('streak message example 1 - day 5 - not started content', async () => {
    const fixedDate = new Date('2025-03-28T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
//     const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    const uniqueWeeks = new Set([day3,day2,day1].map(date => getWeekNumber(date)));

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a '+uniqueWeeks.size+' week streak! Keep up the momentum!')
  })

  test('streak message example 1 - day 7 - not started content', async () => {
    const fixedDate = new Date('2025-03-30T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
//     const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(today);
    day1.setDate(yesterday.getDate() - 3);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    const uniqueWeeks = new Set([day3,day2,day1].map(date => getWeekNumber(date)));

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a '+uniqueWeeks.size+' week streak! Keep up the momentum!')
  })

  test('streak message example 1 - day 7 - started content', async () => {
    const fixedDate = new Date('2025-03-30T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
//     const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(today);
    day1.setDate(yesterday.getDate() - 3);
    const formattedData2 = day1.toISOString().split('T')[0];
    console.log(day1)

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedToday], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    const uniqueWeeks = new Set([today, day3,day2,day1].map(date => getWeekNumber(date)));
    consoleLog(uniqueWeeks)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a '+uniqueWeeks.size+' week streak! Way to keep up the momentum!')
  })

  test('streak message example 1 - day 8 - not started content', async () => {
    const fixedDate = new Date('2025-03-31T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
     const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 4);
    const formattedData2 = day1.toISOString().split('T')[0];

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    const uniqueWeeks = new Set([yesterday, day3,day2,day1].map(date => getWeekNumber(date)));
    consoleLog(uniqueWeeks)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a '+uniqueWeeks.size+' week streak! Keep it going with any lesson or song!')
  })

  test('streak message example 1 - day 8 -  started content', async () => {
    const fixedDate = new Date('2025-03-31T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(today);
    day1.setDate(yesterday.getDate() - 3);
    const formattedData2 = day1.toISOString().split('T')[0];

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 1);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];


    const activeDays = [
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 120 },
      { date: [formattedToday], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message example 1 - day 9 -  not started content', async () => {
    const fixedDate = new Date('2025-04-01T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedData1 = yesterday.toISOString().split('T')[0];

    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];

    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 4);
    const formattedData3 = day2.toISOString().split('T')[0];

    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];

    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedData1], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message example 1 - day 10 -  not started content', async () => {
    const fixedDate = new Date('2025-04-02T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 1);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 4);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message example 1 - day 15 -  not started content', async () => {
    const fixedDate = new Date('2025-04-07T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 6);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message example 1 - day 16 -  not started content', async () => {
    const fixedDate = new Date('2025-04-08T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 7);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
      expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message example 1 - day 21 -  not started content', async () => {
    const fixedDate = new Date('2025-04-13T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 12);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message example 1 - day 22 -  not started content', async () => {
    const fixedDate = new Date('2025-04-14T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 13);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Restart your streak by taking any lesson!')
  })

  test('streak message example 1 - day 22 -  started content', async () => {
    const fixedDate = new Date('2025-04-14T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 13);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedToday], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message example 1 - day 23 -  not started content', async () => {
    const fixedDate = new Date('2025-04-15T12:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    console.log('Today', today)
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedDataYesterday = yesterday.toISOString().split('T')[0];
    let day1 = new Date(yesterday);
    day1.setDate(yesterday.getDate() - 13);
    const formattedData2 = day1.toISOString().split('T')[0];
    let day5 = new Date(day1);
    day5.setDate(day1.getDate() - 1);
    const formattedData6 = day5.toISOString().split('T')[0];
    let day2 = new Date(day1);
    day2.setDate(day1.getDate() - 5);
    const formattedData3 = day2.toISOString().split('T')[0];
    let day3 = new Date(day2);
    day3.setDate(day2.getDate() - 1);
    const formattedData4 = day3.toISOString().split('T')[0];
    let day4 = new Date(day3);
    day4.setDate(day3.getDate() - 1);
    const formattedData5 = day4.toISOString().split('T')[0];

    const activeDays = [
      { date: [formattedData5], duration_seconds: 120 },
      { date: [formattedData4], duration_seconds: 120 },
      { date: [formattedData3], duration_seconds: 120 },
      { date: [formattedData6], duration_seconds: 120 },
      { date: [formattedData2], duration_seconds: 120 },
      { date: [formattedDataYesterday], duration_seconds: 120 },
    ];
    console.log('activeDays', activeDays)
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 day streak! Keep it going with any lesson or song.')
  })

  function consoleLog(message, object=null, debug=false) {
    if (debug || DEBUG) {
      console.log(message, object);
    }
  }

  const loadMockDataForDays = (fileName, datesArray) => {
    const jsonPath = path.join(__dirname, 'mockData/', fileName);
    let json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    let practices = {};

    // Loop through the provided dates and durations
    datesArray.forEach(({ date, duration_seconds }) => {
      practices[date] = [{ "duration_seconds": duration_seconds }];
    });

    // Replace the placeholder with dynamically generated data
    json.data.practices = practices;
    console.log('datesArray practices',json.data)
    return json;
  };
})
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return  weekNo;
}
function getWeekNumber2(date) {
  let startOfYear = new Date(date.getFullYear(), 0, 1)
  let diff = date - startOfYear
  let oneWeekMs = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeekMs) + startOfYear.getDay() / 7)
}
