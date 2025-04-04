import { initializeTestService } from './initializeTests.js'
import {getUserWeeklyStats, userActivityContext} from '../src/services/userActivity.js'
import {log} from './log.js'

import fs from 'fs';
import path from 'path';

global.fetch = jest.fn()
let mock = null
const DEBUG = false


// Test Examples are taken from this document
// https://docs.google.com/spreadsheets/d/1pBmBTAODeRWI5uIO84lXjaQFW-lRPNh6gi7GV0lCwyc/edit?gid=0#gid=0
describe('Streak Messages', function () {
  beforeEach(() => {
    initializeTestService()
    const userLocalMidnight = new Date();
    userLocalMidnight.setFullYear(2025, 2, 24);
    jest.useFakeTimers();
    jest.setSystemTime(userLocalMidnight);
  })

  test('streak message - example1', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = [
        { day: 1, date: '2025-03-24', duration_seconds: 120 },
        { day: 2, date: '2025-03-25', duration_seconds: 120 },
        { day: 3, date: '2025-03-26', duration_seconds: 120 },
        { day: 7, date: '2025-03-30', duration_seconds: 120 },
        { day: 8, date: '2025-03-31', duration_seconds: 120 },
        { day: 22, date: '2025-04-14', duration_seconds: 120 },
        { day: 23, date: '2025-04-15', duration_seconds: 120 },
    ]

    const expectedMessages = [
      {day: 1, incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {day: 2, incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 3, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 3 day streak! Way to keep it going!'},
      {day: 4, incomplete: 'You have a 3 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 5, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 6, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 7, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'You have a 1 week streak! Way to keep up the momentum!'},
      {day: 8, incomplete: 'You have a 1 week streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 9, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 10, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 11, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 12, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 13, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 14, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 15, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 16, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 17, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 18, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 19, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 20, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 21, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 22, incomplete: 'Restart your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {day: 23, incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 24, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    // you can test a specific day by setting this value to the correct date and the test will only run that day
    // this is 0 indexed
    const testSpecificDay = null;
    await testExpectedMessageForDays(allData, expectedMessages, fixedDate, testSpecificDay)
  })

  test('streak message - example2', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = [
      { day: 1, date: '2025-03-24', duration_seconds: 120 },
      { day: 8, date: '2025-03-31', duration_seconds: 120 },
      { day: 10, date: '2025-04-02', duration_seconds: 120 },
      { day: 11, date: '2025-04-03', duration_seconds: 120 },
      { day: 13, date: '2025-04-05', duration_seconds: 120 },
      { day: 16, date: '2025-04-08', duration_seconds: 120 },
    ]

    const expectedMessages = [
      {day: 1, incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {day: 2, incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 3, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 4, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 5, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 6, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 7, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 8, incomplete: 'You have a 1 week streak! Keep it going with any lesson or song!', complete: 'Great job! You have a 2 week streak! Way to keep it going!'},
      {day: 9, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 10, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {day: 11, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 12, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 13, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {day: 14, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 15, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 16, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: 'Great job! You have a 3 week streak! Way to keep it going!'},
      {day: 17, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 18, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 19, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 20, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 21, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 22, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 23, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 24, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 25, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 26, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 27, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 28, incomplete: 'You have a 3 week streak! Keep it going with any lesson or song!', complete: ''},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    // you can test a specific day by setting this value to the correct date and the test will only run that day
    // this is zero indexed so do 1 day below the day you want to test
    const testSpecificDay = null;
    await testExpectedMessageForDays(allData, expectedMessages, fixedDate, testSpecificDay)
  })

  test('streak message - example3', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = [
      { day: 2, date: '2025-03-25', duration_seconds: 120 },
      { day: 5, date: '2025-03-28', duration_seconds: 120 },
      { day: 6, date: '2025-03-29', duration_seconds: 120 },
      { day: 7, date: '2025-03-30', duration_seconds: 120 },
      { day: 9, date: '2025-04-01', duration_seconds: 120 },
      { day: 11, date: '2025-04-03', duration_seconds: 120 },
      { day: 12, date: '2025-04-04', duration_seconds: 120 },
      { day: 17, date: '2025-04-09', duration_seconds: 120 },
      { day: 19, date: '2025-04-11', duration_seconds: 120 },
    ]

    const expectedMessages = [
      {day: 1, incomplete: 'Start your streak by taking any lesson!', complete: ''},
      {day: 2, incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {day: 3, incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 4, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {day: 5, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'You have a 1 week streak! Way to keep up the momentum!'},
      {day: 6, incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 7, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 3 day streak! Way to keep it going!'},
      {day: 8, incomplete: 'You have a 3 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 9, incomplete: 'You have a 1 week streak! Keep it going with any lesson or song!', complete: 'Great job! You have a 2 week streak! Way to keep it going!'},
      {day: 10, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 11, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {day: 12, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 13, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 14, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {day: 15, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 16, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {day: 17, incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: 'Great job! You have a 3 week streak! Way to keep it going!'},
      {day: 18, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {day: 19, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: 'You have a 3 week streak! Way to keep up the momentum!'},
      {day: 20, incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    // you can test a specific day by setting this value to the correct date and the test will only run that day
    // this is 0 indexed
    const testSpecificDay = null;
    await testExpectedMessageForDays(allData, expectedMessages, fixedDate, testSpecificDay)
  })

  test('streak message - example4', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = [
      { day: 1, date: '2025-03-24', duration_seconds: 120},
      { day: 2, date: '2025-03-25', duration_seconds: 120},
      { day: 3, date: '2025-03-26', duration_seconds: 120},
      { day: 4, date: '2025-03-27', duration_seconds: 120},
      { day: 5, date: '2025-03-28', duration_seconds: 120},
      { day: 6, date: '2025-03-29', duration_seconds: 120},
      { day: 7, date: '2025-03-30', duration_seconds: 120},
      { day: 8, date: '2025-03-31', duration_seconds: 120},
    ]

    const expectedMessages = [
      {day: 1, incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {day: 2, incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {day: 3, incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 3 day streak! Way to keep it going!'},
      {day: 4, incomplete: 'You have a 3 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 4 day streak! Way to keep it going!'},
      {day: 5, incomplete: 'You have a 4 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 5 day streak! Way to keep it going!'},
      {day: 6, incomplete: 'You have a 5 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 6 day streak! Way to keep it going!'},
      {day: 7, incomplete: 'You have a 6 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 7 day streak! Way to keep it going!'},
      {day: 8, incomplete: 'You have a 7 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have an 8 day streak! Way to keep it going!'},
      {day: 9, incomplete: 'You have an 8 day streak! Keep it going with any lesson or song!', complete: ''},
      {day: 10, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Keep up the momentum!'},
      {day: 11, incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Keep up the momentum!'},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    // you can test a specific day by setting this value to the correct date and the test will only run that day
    // this is 0 indexed
    const testSpecificDay = null;
    await testExpectedMessageForDays(allData, expectedMessages, fixedDate, testSpecificDay)
  })
})

function incrementFakeDate(nDays = 1){
  let today = new Date();
  today.setFullYear(today.getFullYear(), today.getMonth(), (today.getDate() + nDays));
  jest.useFakeTimers();
  jest.setSystemTime(today);
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
  return json;
};

function sliceExampleData(startDate, nDays, includeToday, activeDays)
{
  if (nDays === 0 && !includeToday) {
    return []
  }
  nDays = includeToday ? nDays : nDays - 1
  let target = new Date(startDate)
  target.setDate(target.getDate() + nDays)
  return activeDays.filter((obj) => {
    let activeDate = new Date(obj.date)
    return activeDate <= target
  })
}

async function testExpectedMessageForDays(exampleData, expectedMessages, startDate, testDayN = null) {
  const start = testDayN ?? 0;
  const end = testDayN != null ? testDayN + 1 : expectedMessages.length
  if (testDayN != null) incrementFakeDate(testDayN)
  for (let i = start; i < end; i++) {
    let target = new Date(startDate)
    target.setDate(target.getDate() + i)
    const setDataAndCheckStreakMessage = async function(includeToday)  {
      let activeDays = sliceExampleData(startDate, i, includeToday, exampleData)
      let json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      let practices = await getUserWeeklyStats()
      const state = includeToday ? 'STARTED' :  'NOT-STARTED'
      const expected = includeToday && !!expectedMessages[i].complete ? expectedMessages[i].complete :
        expectedMessages[i].incomplete
      const day = expectedMessages[i].day
      log(`Running ${state} content tests for Day ${day} on ${target}`)
      log(`Expecting ${expected}`)
      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expected)
    }
    await setDataAndCheckStreakMessage(false)
    await setDataAndCheckStreakMessage(true)
    incrementFakeDate(1)
  }
}
