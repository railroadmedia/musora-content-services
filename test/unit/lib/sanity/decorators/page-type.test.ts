import {
  PAGE_TYPE_FIELD,
  decoratePageType,
  pageTypeDecorator,
  type PageTypeDecoratable,
} from '../../../../../src/lib/sanity/decorators/page-type'

describe('page-type decorator', () => {
  describe('pageTypeDecorator (const)', () => {
    test('field is page_type', () => {
      expect(pageTypeDecorator.field).toBe('page_type')
      expect(PAGE_TYPE_FIELD).toBe('page_type')
    })

    test.each([
      ['song', 'song'],
      ['play-along', 'song'],
      ['jam-track', 'song'],
      ['song-tutorial', 'song'],
      ['song-tutorial-lesson', 'song'],
      ['course', 'lesson'],
      ['workout', 'lesson'],
      ['', 'lesson'],
    ])('type=%j -> %s', (type, expected) => {
      expect(pageTypeDecorator.compute({ type })).toBe(expected)
    })

    test('missing type falls through to lesson', () => {
      expect(pageTypeDecorator.compute({})).toBe('lesson')
    })
  })

  describe('decoratePageType', () => {
    test('decorates a single object', () => {
      const item: PageTypeDecoratable = { type: 'song' }
      const decorated = decoratePageType(item)
      expect(decorated.page_type).toBe('song')
    })

    test('decorates every item in an array', () => {
      const items: PageTypeDecoratable[] = [
        { type: 'song' },
        { type: 'course' },
        { type: 'play-along' },
      ]
      const decorated = decoratePageType(items)
      expect(decorated.map((i) => i.page_type)).toEqual(['song', 'lesson', 'song'])
    })

    test('decorates nested children up to depth 3', () => {
      const tree: PageTypeDecoratable = {
        type: 'course',
        children: [
          {
            type: 'song',
            children: [
              {
                type: 'play-along',
                children: [{ type: 'song' }],
              },
            ],
          },
        ],
      }
      const decorated = decoratePageType(tree)
      expect(decorated.page_type).toBe('lesson')
      const lvl1 = decorated.children![0]
      const lvl2 = lvl1.children![0]
      const lvl3 = lvl2.children![0]
      expect(lvl1.page_type).toBe('song')
      expect(lvl2.page_type).toBe('song')
      expect(lvl3.page_type).toBeUndefined()
    })

    test('preserves the input reference', () => {
      const items: PageTypeDecoratable[] = [{ type: 'song' }]
      const decorated = decoratePageType(items)
      expect(decorated).toBe(items)
    })
  })
})
