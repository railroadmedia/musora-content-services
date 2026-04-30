import { generateForumPostUrl, generatePlaylistUrl, generateContentUrl } from '../../src/services/urlBuilder'
jest.mock('../../src/services/config.js', () => ({
  globalConfig: { frontendUrl: 'https://www.musora.com' }
}))
jest.mock('../../src/services/sanity.js', () => ({
  ...jest.requireActual('../../src/services/sanity.js'),
  fetchByRailContentIds: jest.fn(),
}))
jest.mock('../../src/services/contentProgress.js', () => ({
  getNavigateTo: jest.fn(),
}))
describe('generateForumPostUrl', () => {
  test('returns path without domain by default', () => {
    const result = generateForumPostUrl({ brand: 'drumeo' })
    expect(result).toBe('/drumeo/forums/jump-to-post/')
  })
  test('returns full URL with domain when withDomain is true', () => {
    const result = generateForumPostUrl({ brand: 'drumeo' }, true)
    expect(result).toBe('https://www.musora.com/drumeo/forums/jump-to-post/')
  })
})

describe('generatePlaylistUrl', () => {
  test('returns /playlists/{id} without domain', () => {
    const result = generatePlaylistUrl({ id: 123 })
    expect(result).toBe('/playlists/123')
  })
  test('returns full URL with domain when withDomain is true', () => {
    const result = generatePlaylistUrl({ id: 123 }, true)
    expect(result).toBe('https://www.musora.com/playlists/123')
  })
})

describe('generateContentUrl', () => {
  test('returns /{brand}/method for type method', async () => {
    const result = await generateContentUrl({ id: 123, type: 'method', brand: 'drumeo' })
    expect(result).toBe('/drumeo/method')
  })
  test('returns # when id is missing', async () => {
    const result = await generateContentUrl({ id: 0, type: 'song', brand: 'drumeo' })
    expect(result).toBe('#')
  })
  test('returns /{brand}/lessons/{id}/live for type live', async () => {
    const result = await generateContentUrl({ id: 123, type: 'live', brand: 'drumeo' })
    expect(result).toBe('/drumeo/lessons/123/live')
  })
  test('returns /{brand}/lessons/course-collection/overview/{id} for type course-collection', async () => {
    const result = await generateContentUrl({ id: 123, type: 'course-collection', brand: 'drumeo' })
    expect(result).toBe('/drumeo/lessons/course-collection/overview/123')
  })
  test('returns /{brand}/lessons/pack/overview/{id} for type pack', async () => {
    const result = await generateContentUrl({ id: 123, type: 'pack', brand: 'drumeo' })
    expect(result).toBe('/drumeo/lessons/pack/overview/123')
  })
  test('returns /{brand}/lessons/pack/{id}/{navigateTo.id} for pack-bundle with navigateTo', async () => {
    const result = await generateContentUrl({
      id: 123,
      type: 'pack-bundle',
      brand: 'drumeo',
      navigateTo: { id: 456 }
    })
    expect(result).toBe('/drumeo/lessons/pack/123/456')
  })
  test('returns /{brand}/lessons/pack/overview/{id} for pack-bundle without navigateTo', async () => {
    const result = await generateContentUrl({ id: 123, type: 'pack-bundle', brand: 'drumeo' })
    expect(result).toBe('/drumeo/lessons/pack/overview/123')
  })
  test('returns /{brand}/songs/transcription/{id} for type song', async () => {
    const result = await generateContentUrl({ id: 123, type: 'song', brand: 'drumeo' })
    expect(result).toBe('/drumeo/songs/transcription/123')
  })
})
