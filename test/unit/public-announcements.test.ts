import { initializeTestService } from '../initializeTests.js'
import { blockContentToHtml, fetchPublicAnnouncement } from '../../src/services/notifications/public-announcements'
import { globalConfig } from '../../src/services/config.js'

const TEST_PROJECT_ID = 'test-project'
const TEST_DATASET = 'test-dataset'

describe('blockContentToHtml', () => {
  beforeEach(() => {
    initializeTestService()
    globalConfig.sanityConfig.projectId = TEST_PROJECT_ID
    globalConfig.sanityConfig.dataset = TEST_DATASET
  })

  test('returns empty string for null/undefined blocks', () => {
    expect(blockContentToHtml(null)).toBe('')
    expect(blockContentToHtml(undefined)).toBe('')
  })

  test('renders headings, marks, links and lists', () => {
    const blocks = [
      {
        _type: 'block',
        style: 'h1',
        children: [{ _type: 'span', marks: [], text: 'this is a header 1' }],
        markDefs: [],
      },
      {
        _type: 'block',
        style: 'normal',
        children: [
          { _type: 'span', marks: ['strong'], text: 'bold' },
          { _type: 'span', marks: [], text: ' ' },
          { _type: 'span', marks: ['em'], text: 'italic' },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', marks: ['link1'], text: 'this is link' }],
        markDefs: [{ _key: 'link1', _type: 'link', href: 'app.musora.com' }],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', marks: [], text: 'point 1' }],
        markDefs: [],
      },
      {
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', marks: [], text: 'point 2' }],
        markDefs: [],
      },
    ]

    const html = blockContentToHtml(blocks)

    expect(html).toContain('<h1>this is a header 1</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<a href="app.musora.com">this is link</a>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>point 1</li>')
    expect(html).toContain('<li>point 2</li>')
  })

  test('renders image blocks as an img tag pointing at the Sanity CDN, without an alt attribute', () => {
    const assetId = 'abc123'
    const dimensions = '100x200'
    const format = 'jpg'
    const blocks = [
      {
        _type: 'image',
        asset: {
          _ref: `image-${assetId}-${dimensions}-${format}`,
          _type: 'reference',
        },
      },
    ]

    const html = blockContentToHtml(blocks)

    expect(html).toBe(
      `<img src="https://cdn.sanity.io/images/${TEST_PROJECT_ID}/${TEST_DATASET}/${assetId}-${dimensions}.${format}" />`
    )
    expect(html).not.toContain('alt=')
    expect(html).not.toContain('Unknown block type')
  })

  test('renders nothing for an image block with an unrecognized asset ref', () => {
    const blocks = [
      {
        _type: 'image',
        asset: { _ref: 'not-a-valid-ref', _type: 'reference' },
      },
    ]

    expect(blockContentToHtml(blocks)).toBe('')
  })
})

describe('fetchPublicAnnouncement', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    initializeTestService()
    globalConfig.sanityConfig.token = 'test-token'
    globalConfig.sanityConfig.projectId = TEST_PROJECT_ID
    globalConfig.sanityConfig.dataset = TEST_DATASET
    globalConfig.sanityConfig.version = '2021-06-07'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('converts the announcement message block content into html', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [
          {
            title: 'Heads up',
            slug: 'heads-up',
            published_on: '2020-01-01T00:00:00Z',
            message: [
              {
                _type: 'block',
                style: 'normal',
                children: [{ _type: 'span', marks: [], text: 'yummy yummy bagels' }],
                markDefs: [],
              },
            ],
          },
        ],
      }),
    }) as jest.Mock

    const announcement = await fetchPublicAnnouncement('heads-up')

    expect(announcement.message).toBe('<p>yummy yummy bagels</p>')
  })

  test('returns null when no announcement is found', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: [] }),
    }) as jest.Mock

    const announcement = await fetchPublicAnnouncement('missing-slug')

    expect(announcement).toBeNull()
  })
})
