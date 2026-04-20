import { initializeTestService } from '../initializeTests.js'
import * as UserNotifications from "../../src/services/user/notifications.js";

jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  PATCH: jest.fn(),
  DELETE: jest.fn(),
  HttpClient: jest.fn(),
}))

jest.mock('../../src/services/railcontent.js', () => ({
  fetchUserPermissionsData: jest.fn(() => ({ permissions: [78, 91, 92], isAdmin: false })),
  fetchHandler: jest.fn(),
}))

jest.mock('../../src/services/eventsAPI.js', () => ({
  __esModule: true,
  default: {
    pauseLiveEventCheck: jest.fn().mockResolvedValue(undefined),
  }
}))

import { GET, PUT, DELETE } from '../../src/infrastructure/http/HttpClient'

const baseUrl = `/api/notifications`

describe('UserNotifications module', function () {
  beforeEach(() => {
    initializeTestService()
  })

  describe('fetchNotifications', () => {
    it('calls GET with correct url', async () => {
      GET.mockResolvedValueOnce([{ id: 1 }])

      const result = await UserNotifications.fetchNotifications({
        limit: 5,
        onlyUnread: true,
        page: 2,
      })

      expect(GET).toHaveBeenCalledWith(`${baseUrl}/v1?limit=5&page=2&unread=1`)
      expect(result).toEqual([{ id: 1 }])
    })
  })

  describe('markNotificationAsRead', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.markNotificationAsRead()).rejects.toThrow('notificationId is required')
    })

    it('calls PUT with correct url', async () => {
      PUT.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markNotificationAsRead(123)
      expect(PUT).toHaveBeenCalledWith(`${baseUrl}/v1/read?id=123`, null)
      expect(result).toEqual({ success: true })
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('calls PUT with correct url', async () => {
      PUT.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markAllNotificationsAsRead()
      expect(PUT).toHaveBeenCalledWith(`${baseUrl}/v1/read`, null)
      expect(result).toEqual({ success: true })
    })
  })

  describe('markNotificationAsUnread', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.markNotificationAsUnread()).rejects.toThrow('notificationId is required')
    })

    it('calls PUT with correct url', async () => {
      PUT.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markNotificationAsUnread(456)
      expect(PUT).toHaveBeenCalledWith(`${baseUrl}/v1/unread?id=456`, null)
      expect(result).toEqual({ success: true })
    })
  })

  describe('deleteNotification', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.deleteNotification()).rejects.toThrow('notificationId is required')
    })

    it('calls DELETE with correct url', async () => {
      DELETE.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.deleteNotification(789)
      expect(DELETE).toHaveBeenCalledWith(`${baseUrl}/v1/789`)
      expect(result).toEqual({ success: true })
    })
  })

  describe('fetchUnreadCount', () => {
    it('returns unread count when data is greater than 0', async () => {
      GET.mockResolvedValueOnce({ data: 42 })

      const result = await UserNotifications.fetchUnreadCount()
      expect(GET).toHaveBeenCalledWith(`${baseUrl}/v1/unread-count`)
      expect(result).toEqual({ data: 42 })
    })
  })

  describe('fetchNotificationSettings', () => {
    it('returns empty object if settings is falsy or not object', async () => {
      GET.mockResolvedValueOnce(null)
      expect(await UserNotifications.fetchNotificationSettings()).toEqual({})

      GET.mockResolvedValueOnce('string')
      expect(await UserNotifications.fetchNotificationSettings()).toEqual({})
    })

    it('returns transformed settings grouped by brand', async () => {
      GET.mockResolvedValueOnce({
        drumeo: {
          new_lessons_and_features: { channel: 'email', value: true, brand: 'drumeo' },
          membership_perks_promotions: { channel: 'push', value: false, brand: 'drumeo' },
        },
        pianote: {
          membership_perks_promotions: { channel: 'email', value: true, brand: 'pianote' },
        },
      })

      const result = await UserNotifications.fetchNotificationSettings()

      expect(result).toEqual({
        drumeo: [
          { name: 'new_lessons_and_features', channel: 'email', value: true, brand: 'drumeo' },
          { name: 'membership_perks_promotions', channel: 'push', value: false, brand: 'drumeo' },
        ],
        pianote: [{ name: 'membership_perks_promotions', channel: 'email', value: true, brand: 'pianote' }],
      })
    })
  })

  describe('updateNotificationSetting', () => {
    it('throws if settingName not provided', async () => {
      await expect(UserNotifications.updateNotificationSetting({ brand: 'drumeo' })).rejects.toThrow(
        'The "settingName" parameter is required.'
      )
    })

    it('throws if no channels provided', async () => {
      await expect(
        UserNotifications.updateNotificationSetting({ brand: 'drumeo', settingName: 'new_lesson' })
      ).rejects.toThrow('At least one channel (email, push, or bell) must be provided.')
    })

    it('calls PUT with correct payload and url', async () => {
      PUT.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.updateNotificationSetting({
        brand: 'drumeo',
        settingName: 'membership_perks_promotions',
        email: true,
        push: false,
      })

      expect(PUT).toHaveBeenCalledWith(
        '/api/notifications/v1/settings',
        {
          settings: [
            { name: 'membership_perks_promotions', channel: 'email', value: true, brand: 'drumeo' },
            { name: 'membership_perks_promotions', channel: 'push', value: false, brand: 'drumeo' },
          ],
        }
      )
      expect(result).toEqual({ success: true })
    })
  })
})
