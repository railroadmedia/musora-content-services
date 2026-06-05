import { HttpClient } from '../../src/infrastructure/http/HttpClient'
import { fetchPlayerSettings, updatePlayerSettings } from '../../src/services/user/playerSettings'
import type { PlayerSettings } from '../../src/services/user/types'

jest.mock('../../src/infrastructure/http/HttpClient')

const mockPlayerSettings: PlayerSettings = {
  auto_play: true,
  auto_next: true,
  auto_complete: true,
  playlist_auto_next: true,
}

describe('playerSettings', () => {
  let mockGet: jest.Mock
  let mockPut: jest.Mock

  beforeEach(() => {
    mockGet = jest.fn().mockResolvedValue(mockPlayerSettings)
    mockPut = jest.fn().mockResolvedValue(mockPlayerSettings)
    ;(HttpClient as jest.Mock).mockImplementation(() => ({
      get: mockGet,
      put: mockPut,
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchPlayerSettings', () => {
    test('calls GET on the correct endpoint', async () => {
      await fetchPlayerSettings()
      expect(mockGet).toHaveBeenCalledWith('/api/user-management-system/v1/user/player-settings')
    })

    test('returns the player settings from the API', async () => {
      const result = await fetchPlayerSettings()
      expect(result).toEqual(mockPlayerSettings)
    })
  })

  describe('updatePlayerSettings', () => {
    test('calls PUT on the correct endpoint with provided data', async () => {
      await updatePlayerSettings({ auto_next: false })
      expect(mockPut).toHaveBeenCalledWith(
        '/api/user-management-system/v1/user/player-settings',
        { auto_next: false }
      )
    })

    test('sends only the provided fields (partial update)', async () => {
      await updatePlayerSettings({ playlist_auto_next: false })
      expect(mockPut).toHaveBeenCalledWith(
        expect.any(String),
        { playlist_auto_next: false }
      )
    })

    test('sends all fields when all are provided', async () => {
      const allFields = { auto_play: false, auto_next: false, auto_complete: false, playlist_auto_next: false }
      await updatePlayerSettings(allFields)
      expect(mockPut).toHaveBeenCalledWith(expect.any(String), allFields)
    })

    test('returns the updated player settings from the API', async () => {
      const updated = { ...mockPlayerSettings, auto_next: false }
      mockPut.mockResolvedValue(updated)
      const result = await updatePlayerSettings({ auto_next: false })
      expect(result).toEqual(updated)
    })
  })
})
