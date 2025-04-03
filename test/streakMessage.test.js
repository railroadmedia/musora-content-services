import { initializeTestService } from './initializeTests.js'
import {getUserWeeklyStats, userActivityContext} from '../src/services/userActivity.js'

import fs from 'fs';
import path from 'path';

global.fetch = jest.fn()
let mock = null
const DEBUG = true

describe('Example 1', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - day 1 -not started content', async () => {
    setFakeDate(1);
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

  test('streak message - day 1 - started content', async () => {
    setFakeDate(1);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message - day 2 - not started content', async () => {
    setFakeDate(2);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
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
    setFakeDate(2);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 3 - not started content', async () => {
    setFakeDate(3);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 3 - started content', async () => {
    setFakeDate(3);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 3 day streak. Way to keep it going!')
  })

  test('streak message - day 4 - not started content', async () => {
    setFakeDate(4);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 5 - not started content', async () => {
    setFakeDate(5);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 7 - not started content', async () => {
    setFakeDate(7);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 7 - started content', async () => {
    setFakeDate(7);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 8 - not started content', async () => {
    setFakeDate(8);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 8 -  started content', async () => {
    setFakeDate(8);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 9 -  not started content', async () => {
    setFakeDate(9);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 10 -  not started content', async () => {
    setFakeDate(10);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 15 -  not started content', async () => {
    setFakeDate(15);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 16 -  not started content', async () => {
    setFakeDate(16);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
      expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 21 -  not started content', async () => {
    setFakeDate(21);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 22 -  not started content', async () => {
    setFakeDate(22);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Restart your streak by taking any lesson!')
  })

  test('streak message - day 22 -  started content', async () => {
    setFakeDate(22);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-14', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message - day 23 -  not started content', async () => {
    setFakeDate(23);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-14', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 23 -  started content', async () => {
    setFakeDate(23);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-14', duration_seconds: 120 },
      { date: '2025-04-15', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 24 - not started content', async () => {
    setFakeDate(24);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-26', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-14', duration_seconds: 120 },
      { date: '2025-04-15', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })
})

describe('Example 2', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - day 1 -not started content', async () => {
    setFakeDate(1);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats()
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Start your streak by taking any lesson!')
  })

  test('streak message - day 1 - started content', async () => {
    setFakeDate(1);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message - day 2 - not started content', async () => {
    setFakeDate(2);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 3 - not started content', async () => {
    setFakeDate(3);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 4 - not started content', async () => {
    setFakeDate(4);

    mock = jest.spyOn(userActivityContext, 'fetchData')


    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 5 - not started content', async () => {
    setFakeDate(5);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24' , duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 7 - not started content', async () => {
    setFakeDate(7);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 8 - not started content', async () => {
    setFakeDate(8);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 8 -  started content', async () => {
    setFakeDate(8);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Great job! You have a 2 week streak! Way to keep it going!')
  })

  test('streak message - day 9 -  not started content', async () => {
    setFakeDate(9);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 10 -  not started content', async () => {
    setFakeDate(10);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 10 -  started content', async () => {
    setFakeDate(10);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 11 -  not started content', async () => {
    setFakeDate(11);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 11 -  started content', async () => {
    setFakeDate(11);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 12 - not started content', async () => {
    setFakeDate(12);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 13 - not started content', async () => {
    setFakeDate(13);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 13 - started content', async () => {
    setFakeDate(13);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-05', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 15 -  not started content', async () => {
    setFakeDate(15);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 16 -  not started content', async () => {
    setFakeDate(16);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 16 -  started content', async () => {
    setFakeDate(16);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-08', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Great job! You have a 3 week streak! Way to keep it going!')
  })

  test('streak message - day 17 -  not started content', async () => {
    setFakeDate(17);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-08', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep up the momentum!')
  })

  test('streak message - day 21 -  not started content', async () => {
    setFakeDate(21);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-08', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep up the momentum!')
  })

  test('streak message - day 22 -  not started content', async () => {
    setFakeDate(22);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-08', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 28 - not started content', async () => {
    setFakeDate(28);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-24', duration_seconds: 120 },
      { date: '2025-03-31', duration_seconds: 120 },
      { date: '2025-04-02', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-08', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep it going with any lesson or song!')
  })
})

describe('Example 3', function () {
  beforeEach(() => {
    initializeTestService()

    const fixedDate = new Date('2025-03-24T12:00:00.000Z'); // based on the example first day should be Monday
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  })

  test('streak message - day 1 -not started content', async () => {
    setFakeDate(1);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats()
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Start your streak by taking any lesson!')
  })

  test('streak message - day 2 - not started content', async () => {
    setFakeDate(2);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const activeDays = [];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Start your streak by taking any lesson!')
  })

  test('streak message - day 2 - started content', async () => {
    setFakeDate(2);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const today = new Date();
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 1 day streak!')
  })

  test('streak message - day 3 - not started content', async () => {
    setFakeDate(3);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 4 - not started content', async () => {
    setFakeDate(4);

    mock = jest.spyOn(userActivityContext, 'fetchData')


    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 5 - not started content', async () => {
    setFakeDate(5);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 5 - started content', async () => {
    setFakeDate(5);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 6 - not started content', async () => {
    setFakeDate(6);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep up the momentum!')
  })

  test('streak message - day 6 - started content', async () => {
    setFakeDate(6);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 7 - not started content', async () => {
    setFakeDate(7);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 7 - started content', async () => {
    setFakeDate(7);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)

    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 3 day streak. Way to keep it going!')
  })

  test('streak message - day 8 - not started content', async () => {
    setFakeDate(8);
    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 9 -  not started content', async () => {
    setFakeDate(9);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 1 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 9 -  started content', async () => {
    setFakeDate(9);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Great job! You have a 2 week streak! Way to keep it going!')
  })

  test('streak message - day 10 -  not started content', async () => {
    setFakeDate(10);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 11 -  not started content', async () => {
    setFakeDate(11);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 11 -  started content', async () => {
    setFakeDate(11);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 12 - not started content', async () => {
    setFakeDate(12);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 12 - started content', async () => {
    setFakeDate(12);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Nice! You have a 2 day streak. Way to keep it going!')
  })

  test('streak message - day 13 - not started content', async () => {
    setFakeDate(13);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 day streak! Keep it going with any lesson or song.')
  })

  test('streak message - day 14 - not started content', async () => {
    setFakeDate(14);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep up the momentum!')
  })

  test('streak message - day 15 -  not started content', async () => {
    setFakeDate(15);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 2 week streak! Keep it going with any lesson or song!')
  })

  test('streak message - day 17 -  started content', async () => {
    setFakeDate(17);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
      { date: '2025-04-09', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('Great job! You have a 3 week streak! Way to keep it going!')
  })

  test('streak message - day 18 -  not started content', async () => {
    setFakeDate(18);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
      { date: '2025-04-09', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep up the momentum!')
  })

  test('streak message - day 19 -  not started content', async () => {
    setFakeDate(19);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
      { date: '2025-04-09', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep up the momentum!')
  })

  test('streak message - day 19 - started content', async () => {
    setFakeDate(19);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
      { date: '2025-04-09', duration_seconds: 120 },
      { date: '2025-04-11', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Way to keep up the momentum!')
  })

  test('streak message - day 20 -  not started content', async () => {
    setFakeDate(20);

    mock = jest.spyOn(userActivityContext, 'fetchData')
    const activeDays = [
      { date: '2025-03-25', duration_seconds: 120 },
      { date: '2025-03-28', duration_seconds: 120 },
      { date: '2025-03-29', duration_seconds: 120 },
      { date: '2025-03-30', duration_seconds: 120 },
      { date: '2025-04-01', duration_seconds: 120 },
      { date: '2025-04-03', duration_seconds: 120 },
      { date: '2025-04-04', duration_seconds: 120 },
      { date: '2025-04-09', duration_seconds: 120 },
      { date: '2025-04-11', duration_seconds: 120 },
    ];
    const json = loadMockDataForDays('mockData_user_practices.json', activeDays);
    mock.mockImplementation(() => json);

    userActivityContext.clearCache()
    const practices = await getUserWeeklyStats( )
    consoleLog(practices)
    expect(practices.data.streakMessage).toBeDefined
    expect(practices.data.streakMessage).toBe('You have a 3 week streak! Keep up the momentum!')
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
