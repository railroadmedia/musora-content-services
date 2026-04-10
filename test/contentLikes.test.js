import {
  isContentLiked,
  likeContent,
  unlikeContent,
} from '../src/services/contentLikes'
import { initializeTestService } from './initializeTests'

let mockLikedIds = new Set()

jest.mock('../src/services/sync/repository-proxy', () => {
  const mockFns = {
    likes: {
      isLiked: jest.fn().mockImplementation((contentId) =>
        Promise.resolve({ data: mockLikedIds.has(Number(contentId)) })
      ),
      areLiked: jest.fn().mockImplementation((contentIds) =>
        Promise.resolve({ data: contentIds.map(id => mockLikedIds.has(Number(id))) })
      ),
      like: jest.fn().mockImplementation((contentId) => {
        mockLikedIds.add(Number(contentId))
        return Promise.resolve({ success: true })
      }),
      unlike: jest.fn().mockImplementation((contentId) => {
        mockLikedIds.delete(Number(contentId))
        return Promise.resolve({ success: true })
      }),
    }
  }
  return { default: mockFns, ...mockFns }
})


describe('contentLikesDataContext', function () {
  beforeEach(() => {
    initializeTestService()
    mockLikedIds = new Set([308516, 308515, 308514, 308518])
  })

  test('contentLiked', async () => {
    expect(await isContentLiked(308516)).toBe(true)
  })

  test('contentLikedStringInput', async () => {
    expect(await isContentLiked('308516')).toBe(true)
  })

  test('contentNotLiked', async () => {
    expect(await isContentLiked(121111)).toBe(false)
  })

  test('likeContent', async () => {
    expect(await isContentLiked(111111)).toBe(false)
    await likeContent(111111)
    expect(await isContentLiked(111111)).toBe(true)
  })

  test('unlikeContent', async () => {
    expect(await isContentLiked(308516)).toBe(true)
    await unlikeContent(308516)
    expect(await isContentLiked(308516)).toBe(false)
  })
})
