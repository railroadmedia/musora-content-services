import { initializeTestService } from './initializeTests.js'
import * as UserNotifications from "../src/services/user/notifications.js";
import { fetchHandler } from '../src/services/railcontent.js'


jest.mock('../src/services/railcontent.js', () => ({
  fetchUserPermissionsData: jest.fn(() => ({ permissions: [78, 91, 92], isAdmin: false })),
  fetchHandler: jest.fn(),
}))

const baseUrl = `/api/notifications`

describe('UserNotifications module', function () {
  beforeEach(() => {
    initializeTestService()
  })

  describe('fetchNotifications', () => {
    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce([{ id: 1 }])

      const result = await UserNotifications.fetchNotifications({
        limit: 5,
        onlyUnread: true,
        page: 2,
      })

      expect(fetchHandler).toHaveBeenCalledWith(
        `${baseUrl}/v1?limit=5&page=2&unread=1`,
        'get'
      )
      expect(result).toEqual([{ id: 1 }])
    })
  })

  describe('markNotificationAsRead', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.markNotificationAsRead()).rejects.toThrow('notificationId is required')
    })

    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markNotificationAsRead(123)
      expect(fetchHandler).toHaveBeenCalledWith(`${baseUrl}/v1/read?id=123`, 'put')
      expect(result).toEqual({ success: true })
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markAllNotificationsAsRead('drumeo')
      expect(fetchHandler).toHaveBeenCalledWith(`${baseUrl}/v1/read?brand=drumeo`, 'put')
      expect(result).toEqual({ success: true })
    })
  })

  describe('markNotificationAsUnread', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.markNotificationAsUnread()).rejects.toThrow('notificationId is required')
    })

    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.markNotificationAsUnread(456)
      expect(fetchHandler).toHaveBeenCalledWith(`${baseUrl}/v1/unread?id=456`, 'put')
      expect(result).toEqual({ success: true })
    })
  })

  describe('deleteNotification', () => {
    it('throws if notificationId not provided', async () => {
      await expect(UserNotifications.deleteNotification()).rejects.toThrow('notificationId is required')
    })

    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.deleteNotification(789)
      expect(fetchHandler).toHaveBeenCalledWith(`${baseUrl}/v1/789`, 'delete')
      expect(result).toEqual({ success: true })
    })
  })

  describe('fetchUnreadCount', () => {
    it('calls fetchHandler with correct url and method', async () => {
      fetchHandler.mockResolvedValueOnce({ unread_count: 42 })

      const result = await UserNotifications.fetchUnreadCount()
      expect(fetchHandler).toHaveBeenCalledWith(`${baseUrl}/v1/unread-count`, 'get')
      expect(result).toEqual({ unread_count: 42 })
    })
  })

  describe('fetchNotificationSettings', () => {
    it('returns empty object if settings is falsy or not object', async () => {
      fetchHandler.mockResolvedValueOnce(null)
      expect(await UserNotifications.fetchNotificationSettings()).toEqual({})

      fetchHandler.mockResolvedValueOnce('string')
      expect(await UserNotifications.fetchNotificationSettings()).toEqual({})
    })

    it('returns transformed settings grouped by brand', async () => {
      fetchHandler.mockResolvedValueOnce({
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

    it('calls fetchHandler with correct payload and url', async () => {
      fetchHandler.mockResolvedValueOnce({ success: true })

      const result = await UserNotifications.updateNotificationSetting({
        brand: 'drumeo',
        settingName: 'membership_perks_promotions',
        email: true,
        push: false,
      })

      expect(fetchHandler).toHaveBeenCalledWith(
        '/api/notification-settings/v1',
        'PUT',
        null,
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
