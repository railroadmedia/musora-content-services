import { initializeTestService } from './initializeTests.js'
import {getUserWeeklyStats, userActivityContext} from '../src/services/userActivity.js'

import fs from 'fs';
import path from 'path';

global.fetch = jest.fn()
let mock = null
const DEBUG = true

function example1Data() {
  return [
    { date: '2025-03-24', duration_seconds: 120 },
    { date: '2025-03-25', duration_seconds: 120 },
    { date: '2025-03-26', duration_seconds: 120 },
    { date: '2025-03-30', duration_seconds: 120 },
    { date: '2025-03-31', duration_seconds: 120 },
    { date: '2025-04-14', duration_seconds: 120 },
    { date: '2025-04-15', duration_seconds: 120 },
  ]
}

function example2Data() {
  return [
    { date: '2025-03-24', duration_seconds: 120 },
    { date: '2025-03-31', duration_seconds: 120 },
    { date: '2025-04-02', duration_seconds: 120 },
    { date: '2025-04-03', duration_seconds: 120 },
    { date: '2025-04-08', duration_seconds: 120 },
  ]
}

function example3Data() {
  return [
    { date: '2025-03-25', duration_seconds: 120 },
    { date: '2025-03-28', duration_seconds: 120 },
    { date: '2025-03-29', duration_seconds: 120 },
    { date: '2025-03-30', duration_seconds: 120 },
    { date: '2025-04-01', duration_seconds: 120 },
    { date: '2025-04-03', duration_seconds: 120 },
    { date: '2025-04-04', duration_seconds: 120 },
    { date: '2025-04-09', duration_seconds: 120 },
    { date: '2025-04-11', duration_seconds: 120 },
  ]
}

function getExampleData(startDate, nDays, includeToday, activeDays)
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

describe('Example 1', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - example1', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = example1Data()

    const expectedMessages = [
    {incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
    {incomplete: 'You have a 1 day streak! Keep it going with any lesson or song.', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
    {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song.', complete: 'Nice! You have a 3 day streak! Way to keep it going!'},
    {incomplete: 'You have a 3 day streak! Keep it going with any lesson or song.', complete: ''},
    {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'You have a 1 week streak! Way to keep up the momentum!'},
    {incomplete: 'You have a 1 week streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
    {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
    {incomplete: 'Restart your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
    {incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
    {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: ''},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    for (let i = 0; i < 22; i++) {
      setFakeDate(i+1);
      let activeDays = getExampleData(fixedDate, i, false, allData)
      console.log('active days', activeDays)
      let json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      console.log(`json for day ${i}`, json)
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      let practices = await getUserWeeklyStats( )
      consoleLog(practices)

      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expectedMessages[i].incomplete)

      activeDays = getExampleData(fixedDate, i, true, allData)
      console.log('active days', activeDays)
      json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
       practices = await getUserWeeklyStats( )
      consoleLog(practices)
      const expected = expectedMessages[i].complete ? expectedMessages[i].complete : expectedMessages[i].incomplete
      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expected)
    }
  })
})

describe('Example 2', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - example2', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = example2Data()

    const expectedMessages = [{incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {incomplete: 'You have a 1 day streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak. Keep it going with any lesson or song!', complete: 'Great job! You have a 2 week streak! Way to keep it going!'},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song.', complete: 'Great job! You have a 3 week streak! Way to keep it going!'},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep it going with any lesson or song.', complete: ''},
    ]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    for (let i = 0; i < expectedMessages.length; i++) {
      setFakeDate(i+1);
      let activeDays = getExampleData(fixedDate, i, false, allData)
      console.log('active days', activeDays)
      let json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      console.log(`json for day ${i}`, json)
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      let practices = await getUserWeeklyStats( )
      consoleLog(practices)

      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expectedMessages[i].incomplete)

      activeDays = getExampleData(fixedDate, i, true, allData)
      console.log('active days', activeDays)
      json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      practices = await getUserWeeklyStats( )
      consoleLog(practices)
      const expected = expectedMessages[i].complete ? expectedMessages[i].complete : expectedMessages[i].incomplete
      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expected)
    }
  })
})

describe('Example 3', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - example3', async () => {
    const fixedDate = new Date('2025-03-24T12:00:00.000Z');
    const allData = example3Data()

    const expectedMessages = [{incomplete: 'Start your streak by taking any lesson!', complete: ''},
      {incomplete: 'Start your streak by taking any lesson!', complete: 'Nice! You have a 1 day streak!'},
      {incomplete: 'You have a 1 day streak! Keep it going with any lesson or song!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'You have a 1 week streak! Way to keep up the momentum!'},
      {incomplete: 'You have a 1 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep it going!'},
      {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song!', complete: 'Nice! You have a 3 day streak! Way to keep it going!'},
      {incomplete: 'You have a 3 day streak! Keep it going with any lesson or song!', complete: ''},
      {incomplete: 'You have a 1 week streak. Keep it going with any lesson or song!', complete: 'Great job! You have a 2 week streak! Way to keep it going!'},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'You have a 2 week streak! Way to keep up the momentum!'},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: 'Nice! You have a 2 day streak! Way to keep your streak going!'},
      {incomplete: 'You have a 2 day streak! Keep it going with any lesson or song.', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: ''},
      {incomplete: 'You have a 2 week streak! Keep it going with any lesson or song!', complete: 'Great job! You have a 3 week streak! Way to keep it going!'},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: 'You have a 3 week streak! Way to keep up the momentum!'},
      {incomplete: 'You have a 3 week streak! Keep up the momentum!', complete: ''},]

    mock = jest.spyOn(userActivityContext, 'fetchData')
    for (let i = 0; i < expectedMessages.length; i++) {
      setFakeDate(i+1);
      let activeDays = getExampleData(fixedDate, i, false, allData)
      console.log('active days', activeDays)
      let json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      console.log(`json for day ${i}`, json)
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      let practices = await getUserWeeklyStats( )
      consoleLog(practices)

      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expectedMessages[i].incomplete)

      activeDays = getExampleData(fixedDate, i, true, allData)
      console.log('active days', activeDays)
      json = loadMockDataForDays('mockData_user_practices.json', activeDays);
      mock.mockImplementation(() => json);
      userActivityContext.clearCache()
      practices = await getUserWeeklyStats( )
      consoleLog(practices)
      const expected = expectedMessages[i].complete ? expectedMessages[i].complete : expectedMessages[i].incomplete
      expect(practices.data.streakMessage).toBeDefined()
      expect(practices.data.streakMessage).toBe(expected)
    }
  })
})

function setFakeDate(day = 1){
  const fixedDate = new Date();
  let today = new Date(fixedDate);
  today.setDate(today.getDate() + day - 1);
  jest.useFakeTimers();
  jest.setSystemTime(today);
}
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
  return json;
};
