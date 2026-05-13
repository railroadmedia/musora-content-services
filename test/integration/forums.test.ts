import { getActiveDiscussions } from '@/services/forums/forums'

const mockGet = jest.fn()

jest.mock('@/infrastructure/http/HttpClient', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
}))

function makeThread(overrides = {}) {
  return {
    id: 1,
    slug: 'test-thread',
    title: 'Test Thread',
    locked: false,
    pinned: false,
    state: 'open',
    category_id: 10,
    post_count: 1,
    is_read: false,
    author: {
      id: 100,
      display_name: 'Jane Doe',
      profile_picture_url: 'https://example.com/avatar.jpg',
      access_level: 'member',
      signature: null,
    },
    last_post: {
      id: 200,
      content: 'Hello world',
      created_at: '2024-01-01T00:00:00Z',
      created_at_human: '1 day ago',
      author: null,
      like_count: 0,
      is_liked: false,
    },
    ...overrides,
  }
}

function makePaginatedResponse(threads = [makeThread()]) {
  return {
    data: threads,
    meta: {
      current_page: 1,
      per_page: 10,
      total: threads.length,
      last_page: 1,
    },
  }
}

describe('getActiveDiscussions', () => {
  test('returns transformed data and meta', async () => {
    mockGet.mockResolvedValue(makePaginatedResponse())

    const result = await getActiveDiscussions('drumeo')

    expect(result.data).toHaveLength(1)
    expect(result.meta).toBeDefined()
    expect(result.meta.current_page).toBe(1)
  })

  test('maps thread fields correctly', async () => {
    mockGet.mockResolvedValue(makePaginatedResponse())

    const result = await getActiveDiscussions('drumeo')
    const thread = result.data[0]

    expect(thread.id).toBe(1)
    expect(thread.url).toBe('forums/threads/10/1')
    expect(thread.title).toBe('Test Thread')
    expect(thread.post).toBe('Hello world')
    expect(thread.author.id).toBe(100)
    expect(thread.author.name).toBe('Jane Doe')
    expect(thread.author.avatar).toBe('https://example.com/avatar.jpg')
  })

  test('maps author avatar to empty string when profile_picture_url is null', async () => {
    const thread = makeThread({
      author: { id: 1, display_name: 'No Avatar', profile_picture_url: null, access_level: 'member', signature: null },
    })
    mockGet.mockResolvedValue(makePaginatedResponse([thread]))

    const result = await getActiveDiscussions('drumeo')

    expect(result.data[0].author.avatar).toBe('')
  })

  test('filters out threads with null last_post', async () => {
    const threads = [makeThread({ last_post: null }), makeThread({ id: 2 })]
    mockGet.mockResolvedValue(makePaginatedResponse(threads))

    const result = await getActiveDiscussions('drumeo')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(2)
  })

  test('filters out threads with null author', async () => {
    const threads = [makeThread({ author: null }), makeThread({ id: 2 })]
    mockGet.mockResolvedValue(makePaginatedResponse(threads))

    const result = await getActiveDiscussions('drumeo')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(2)
  })

  test('passes brand, page and limit to the HTTP call', async () => {
    mockGet.mockResolvedValue(makePaginatedResponse())

    await getActiveDiscussions('pianote', { page: 3, limit: 25 })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/forums/v1/threads/latest?brand=pianote&page=3&limit=25'
    )
  })

  test('defaults page to 1 and limit to 10', async () => {
    mockGet.mockResolvedValue(makePaginatedResponse())

    await getActiveDiscussions('drumeo')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/forums/v1/threads/latest?brand=drumeo&page=1&limit=10'
    )
  })

  describe('stripHtml', () => {
    test('removes blockquote and its content', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: 'Before<blockquote>quoted text</blockquote>After', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('BeforeAfter')
    })

    test('removes iframes and their content', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: 'Before<iframe src="x">content</iframe>After', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('BeforeAfter')
    })

    test('converts <br> to space to prevent word concatenation', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: 'word1<br>word2<br/>word3', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('word1 word2 word3')
    })

    test('converts closing block-level tags to spaces', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: '<p>word1</p><div>word2</div>', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('word1 word2')
    })

    test('decodes HTML entities', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: 'a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39; f&nbsp;g', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe("a & b <c> \"d\" 'e' f g")
    })

    test('removes remaining HTML tags', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: '<strong>bold</strong> and <em>italic</em>', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('bold and italic')
    })

    test('replaces img tags with spaces', async () => {
      const thread = makeThread({
        last_post: { id: 1, content: 'word1<img src="x.jpg">word2', created_at: '', created_at_human: '', author: null, like_count: 0, is_liked: false },
      })
      mockGet.mockResolvedValue(makePaginatedResponse([thread]))

      const result = await getActiveDiscussions('drumeo')

      expect(result.data[0].post).toBe('word1 word2')
    })
  })
})
