import eventsAPISingleton from '../../src/services/eventsAPI.js'
import { initializeTestService } from '../initializeTests.js'

const notificationsModule = require('../../src/services/notifications/notifications.js')
const EventsAPI = eventsAPISingleton.constructor as new () => typeof eventsAPISingleton

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe('EventsAPI notification polling lifecycle', () => {
  let api: typeof eventsAPISingleton
  let fetchUnreadCountMock: jest.SpyInstance

  beforeEach(() => {
    initializeTestService()
    jest.useFakeTimers()

    api = new EventsAPI()
    jest.spyOn(api, 'initPollingControl').mockResolvedValue({})
    fetchUnreadCountMock = jest
      .spyOn(notificationsModule, 'fetchUnreadCount')
      .mockResolvedValue({ data: 0 })
  })

  afterEach(() => {
    api.destroy()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  test('initialize keeps the existing polling behavior', async () => {
    await api.initialize({ brand: 'pianote' })

    expect(fetchUnreadCountMock).toHaveBeenCalledWith({ brand: 'pianote' })
    expect(api.pollingInterval).not.toBeNull()

    fetchUnreadCountMock.mockClear()
    await jest.advanceTimersByTimeAsync(60000)

    expect(fetchUnreadCountMock).toHaveBeenCalledTimes(1)
  })

  test('pause stops polling without removing subscribers', async () => {
    const handler = jest.fn()
    api.addNotificationStateUpdatedHandler(handler)
    await api.initialize()
    handler.mockClear()
    fetchUnreadCountMock.mockClear()

    api.pauseNotificationPolling()
    await jest.advanceTimersByTimeAsync(120000)

    expect(api.pollingInterval).toBeNull()
    expect(api.onNotificationStateUpdated).toEqual([handler])
    expect(fetchUnreadCountMock).not.toHaveBeenCalled()
  })

  test('resume starts one interval and immediately refreshes existing subscribers', async () => {
    const handler = jest.fn()
    api.addNotificationStateUpdatedHandler(handler)
    await api.initialize()
    api.pauseNotificationPolling()
    fetchUnreadCountMock.mockResolvedValue({ data: 1, liveEvent: null })
    fetchUnreadCountMock.mockClear()
    handler.mockClear()

    await api.resumeNotificationPolling()
    const resumedInterval = api.pollingInterval
    await api.resumeNotificationPolling()

    expect(resumedInterval).not.toBeNull()
    expect(api.pollingInterval).toBe(resumedInterval)
    expect(fetchUnreadCountMock).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenLastCalledWith({ unreadCount: 1, liveEvent: null })
  })

  test('repeated pause calls are safe', async () => {
    await api.initialize()

    api.pauseNotificationPolling()
    api.pauseNotificationPolling()

    expect(api.pollingInterval).toBeNull()
  })

  test('pause during asynchronous setup prevents the interval from being created', async () => {
    const pollingControl = deferred<Record<string, never>>()
    jest.spyOn(api, 'initPollingControl').mockReturnValue(pollingControl.promise)

    const initializePromise = api.initialize()
    api.pauseNotificationPolling()
    pollingControl.resolve({})
    await initializePromise

    expect(api.pollingInterval).toBeNull()
    expect(fetchUnreadCountMock).toHaveBeenCalledTimes(1)
  })

  test('resume during asynchronous setup creates no duplicate interval', async () => {
    const pollingControl = deferred<Record<string, never>>()
    jest.spyOn(api, 'initPollingControl').mockReturnValue(pollingControl.promise)

    const initializePromise = api.initialize()
    api.pauseNotificationPolling()
    const resumePromise = api.resumeNotificationPolling()
    const resumedInterval = api.pollingInterval
    pollingControl.resolve({})
    await Promise.all([initializePromise, resumePromise])

    expect(resumedInterval).not.toBeNull()
    expect(api.pollingInterval).toBe(resumedInterval)
  })

  test('pause and resume while the initial unread request is pending restores polling', async () => {
    const initialUnreadCount = deferred<{ data: number }>()
    fetchUnreadCountMock
      .mockReturnValueOnce(initialUnreadCount.promise)
      .mockResolvedValue({ data: 1 })

    const initializePromise = api.initialize()
    await Promise.resolve()
    await Promise.resolve()
    expect(api.pollingInterval).not.toBeNull()

    api.pauseNotificationPolling()
    const resumePromise = api.resumeNotificationPolling()

    expect(api.pollingInterval).not.toBeNull()
    initialUnreadCount.resolve({ data: 0 })
    await Promise.all([initializePromise, resumePromise])

    fetchUnreadCountMock.mockClear()
    await jest.advanceTimersByTimeAsync(60000)
    expect(fetchUnreadCountMock).toHaveBeenCalledTimes(1)
  })

  test('destroy remains a full teardown and initialize can start again', async () => {
    api.addNotificationStateUpdatedHandler(jest.fn())
    await api.initialize()

    api.destroy()

    expect(api.pollingInterval).toBeNull()
    expect(api.onNotificationStateUpdated).toEqual([])
    expect(api.isLiveEventPollingActive).toBe(false)

    fetchUnreadCountMock.mockClear()
    await api.initialize()

    expect(api.pollingInterval).not.toBeNull()
    expect(fetchUnreadCountMock).toHaveBeenCalledTimes(1)
  })
})
