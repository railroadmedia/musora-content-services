import { processPlaylistItem, getRecentPlaylists, getPlaylistEngagedOnContent } from '../../../src/services/progress-row/rows/playlist-card.js'
jest.mock('../../../src/services/content-org/playlists.js', () => ({
  fetchUserPlaylists: jest.fn(),
}))
jest.mock('../../../src/services/sanity.js', () => ({
  ...jest.requireActual('../../../src/services/sanity.js'),
  fetchByRailContentIds: jest.fn(),
}))
jest.mock('../../../src/services/contentAggregator.js', () => ({
  addContextToContent: jest.fn(),
}))
import { fetchUserPlaylists } from '../../../src/services/content-org/playlists.js'
const mockPlaylistItem = {
  pinned: false,
  progressTimestamp: 1234567890,
  playlist: {
    id: 1,
    name: 'My Playlist',
    brand: 'drumeo',
    duration_formated: '1h 30m',
    total_items: 10,
    likes: 5,
    first_items_thumbnail_url: [
    {
        thumbnail: 'https://cdn.example.com/thumb.jpg',
        type: 'song',
        artist_name: 'Kiss',
        title: "Mwaa"
     }
    ] 
    navigateTo: { id: 42, content_id: 99 },
    user: { display_name: 'John Doe' },
  },
}
describe('processPlaylistItem', () => {
  test('returns correctly shaped object from playlist item', () => {
    const result = processPlaylistItem(mockPlaylistItem)
    expect(result).toMatchObject({
      id: 1,
      progressType: 'playlist',
      header: 'playlist',
      pinned: false,
      progressTimestamp: 1234567890,
      cta: {
        text: 'Continue',
        action: {
          brand: 'drumeo',
          item_id: 42,
          content_id: 99,
          type: 'playlists',
          id: 1,
        },
      },
    })
  })
  test('pinned defaults to false when not set', () => {
    const item = { ...mockPlaylistItem, pinned: undefined }
    const result = processPlaylistItem(item)
    expect(result.pinned).toBe(false)
  })
  test('pinned is true when set', () => {
    const item = { ...mockPlaylistItem, pinned: true }
    const result = processPlaylistItem(item)
    expect(result.pinned).toBe(true)
  })
  test('subtitle combines duration, total_items, likes and display_name', () => {
    const result = processPlaylistItem(mockPlaylistItem)
    expect(result.body.subtitle).toBe('1h 30m • 10 items • 5 likes • John Doe')
  })
})
describe('getRecentPlaylists', () => {
  test('filters out playlists with no last_progress', async () => {
    (fetchUserPlaylists as jest.Mock).mockResolvedValue({
      data: [
        { id: 1, last_progress: '2024-01-01 10:00:00', last_engaged_on: 123 },
        { id: 2, last_progress: null, last_engaged_on: 123 },
      ]
    })
    const result = await getRecentPlaylists('drumeo', 10)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })
  test('converts last_progress date string to UTC timestamp', async () => {
    (fetchUserPlaylists as jest.Mock).mockResolvedValue({
      data: [
        { id: 1, last_progress: '2024-01-01 10:00:00', last_engaged_on: 123 },
      ]
    })
    const result = await getRecentPlaylists('drumeo', 10)
    expect(typeof result[0].progressTimestamp).toBe('number')
    expect(result[0].progressTimestamp).toBe(new Date('2024-01-01T10:00:00Z').getTime())
  })
  test('returns empty array when response has no data', async () => {
    (fetchUserPlaylists as jest.Mock).mockResolvedValue({ data: [] })
    const result = await getRecentPlaylists('drumeo', 10)
    expect(result).toHaveLength(0)
  })
})
describe('getPlaylistEngagedOnContent', () => {
  test('returns empty array when recentPlaylists is empty', async () => {
    const result = await getPlaylistEngagedOnContent([])
    expect(result).toEqual([])
  })
})
