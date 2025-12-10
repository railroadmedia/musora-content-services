/**
 * Pure unit tests for Filters class synchronous methods
 * Tests GROQ filter generation without external dependencies
 */

import Filters from '../../src/lib/sanity/filter'

describe('Filters - Pure Synchronous Functions', () => {
  describe('Simple Filters', () => {
    describe('brand', () => {
      test('generates brand filter with double quotes', () => {
        expect(Filters.brand('drumeo')).toBe('brand == "drumeo"')
      })

      test('handles different brand names', () => {
        expect(Filters.brand('pianote')).toBe('brand == "pianote"')
        expect(Filters.brand('guitareo')).toBe('brand == "guitareo"')
      })
    })

    describe('type', () => {
      test('generates type filter', () => {
        expect(Filters.type('song')).toBe('_type == "song"')
      })
    })

    describe('slug', () => {
      test('generates slug filter with .current', () => {
        expect(Filters.slug('guitar-basics')).toBe('slug.current == "guitar-basics"')
      })
    })

    describe('railcontentId', () => {
      test('generates railcontent_id filter', () => {
        expect(Filters.railcontentId(12345)).toBe('railcontent_id == 12345')
      })
    })

    describe('statusIn', () => {
      test('generates status in array filter', () => {
        const result = Filters.statusIn(['published', 'scheduled'])
        expect(result).toBe("status in ['published','scheduled']")
      })

      test('handles empty array', () => {
        expect(Filters.statusIn([])).toBe('status in []')
      })
    })

    describe('idIn', () => {
      test('generates railcontent_id in array filter', () => {
        const result = Filters.idIn([123, 456, 789])
        expect(result).toBe('railcontent_id in [123,456,789]')
      })

      test('handles empty array', () => {
        expect(Filters.idIn([])).toBe('railcontent_id in []')
      })
    })

    describe('references', () => {
      test('generates references filter', () => {
        expect(Filters.references('abc123')).toBe('references("abc123")')
      })
    })

    describe('referencesIDWithFilter', () => {
      test('generates references with subquery filter', () => {
        const filter = 'brand == "drumeo"'
        expect(Filters.referencesIDWithFilter(filter)).toBe('references(*[brand == "drumeo"]._id)')
      })
    })

    describe('referencesParent', () => {
      test('generates parent reference filter', () => {
        expect(Filters.referencesParent()).toBe('references(^._id)')
      })
    })

    describe('referencesField', () => {
      test('generates field-based reference filter', () => {
        const result = Filters.referencesField('slug.current', 'john-doe')
        expect(result).toBe('references(*[slug.current == "john-doe"]._id)')
      })
    })

    describe('titleMatch', () => {
      test('generates title match filter with wildcard', () => {
        expect(Filters.titleMatch('guitar')).toBe('title match "guitar*"')
      })
    })

    describe('searchMatch', () => {
      test('generates search match filter with term', () => {
        const result = Filters.searchMatch('description', 'beginner')
        expect(result).toBe('description match "beginner*"')
      })

      test('returns empty string without term', () => {
        expect(Filters.searchMatch('description')).toBe('')
      })
    })

    describe('publishedBefore', () => {
      test('generates published_on <= filter', () => {
        const date = '2024-01-01T00:00:00.000Z'
        expect(Filters.publishedBefore(date)).toBe(`published_on <= "${date}"`)
      })
    })

    describe('publishedAfter', () => {
      test('generates published_on >= filter', () => {
        const date = '2024-01-01T00:00:00.000Z'
        expect(Filters.publishedAfter(date)).toBe(`published_on >= "${date}"`)
      })
    })

    describe('defined', () => {
      test('generates defined() filter', () => {
        expect(Filters.defined('thumbnail')).toBe('defined(thumbnail)')
      })
    })

    describe('notDefined', () => {
      test('generates !defined() filter', () => {
        expect(Filters.notDefined('thumbnail')).toBe('!defined(thumbnail)')
      })
    })
  })

  describe('Field Checking - notDeprecated', () => {
    test('generates filter without prefix', () => {
      expect(Filters.notDeprecated()).toBe('!defined(deprecated_railcontent_id)')
    })

    test('generates filter with empty string prefix', () => {
      expect(Filters.notDeprecated('')).toBe('!defined(deprecated_railcontent_id)')
    })

    test('generates filter with child prefix', () => {
      expect(Filters.notDeprecated('@->')).toBe('!defined(@->deprecated_railcontent_id)')
    })

    test('generates filter with parent prefix', () => {
      expect(Filters.notDeprecated('^.')).toBe('!defined(^.deprecated_railcontent_id)')
    })
  })

  describe('Prefix Modifiers', () => {
    describe('withPrefix', () => {
      test('applies child prefix to filter', () => {
        const filter = Filters.brand('drumeo')
        const result = Filters.withPrefix('@->', filter)
        expect(result).toBe('@->brand == "drumeo"')
      })

      test('applies parent prefix to filter', () => {
        const filter = Filters.type('song')
        const result = Filters.withPrefix('^.', filter)
        expect(result).toBe('^._type == "song"')
      })

      test('empty prefix returns original filter', () => {
        const filter = Filters.brand('drumeo')
        expect(Filters.withPrefix('', filter)).toBe(filter)
      })
    })

    describe('asChild', () => {
      test('applies child prefix to simple filter', () => {
        const result = Filters.asChild(Filters.brand('drumeo'))
        expect(result).toBe('@->brand == "drumeo"')
      })

      test('applies child prefix to statusIn filter', () => {
        const result = Filters.asChild(Filters.statusIn(['published']))
        expect(result).toBe("@->status in ['published']")
      })
    })

    describe('asParent', () => {
      test('applies parent prefix to filter', () => {
        const result = Filters.asParent(Filters.type('song'))
        expect(result).toBe('^._type == "song"')
      })
    })
  })

  describe('Composition Utilities', () => {
    describe('combine', () => {
      test('combines two filters with &&', () => {
        const result = Filters.combine(Filters.brand('drumeo'), Filters.type('song'))
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('combines multiple filters', () => {
        const result = Filters.combine(
          Filters.brand('drumeo'),
          Filters.type('song'),
          Filters.statusIn(['published'])
        )
        expect(result).toContain('brand == "drumeo"')
        expect(result).toContain('_type == "song"')
        expect(result).toContain("status in ['published']")
        expect(result.split(' && ')).toHaveLength(3)
      })

      test('filters out undefined, null, and false values', () => {
        const result = Filters.combine(
          Filters.brand('drumeo'),
          undefined,
          null,
          false,
          Filters.type('song')
        )
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('returns single filter without &&', () => {
        const result = Filters.combine(Filters.brand('drumeo'))
        expect(result).toBe('brand == "drumeo"')
      })

      test('returns empty string for all falsy values', () => {
        const result = Filters.combine(undefined, null, false)
        expect(result).toBe('')
      })
    })

    describe('combineOr', () => {
      test('wraps multiple filters in parentheses with ||', () => {
        const result = Filters.combineOr(Filters.type('song'), Filters.type('workout'))
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })

      test('single filter has no parentheses', () => {
        const result = Filters.combineOr(Filters.type('song'))
        expect(result).toBe('_type == "song"')
      })

      test('returns empty string for no filters', () => {
        expect(Filters.combineOr()).toBe('')
      })

      test('filters out falsy values', () => {
        const result = Filters.combineOr(
          undefined,
          Filters.type('song'),
          null,
          false,
          Filters.type('workout')
        )
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })
    })
  })

  describe('publishedDate', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      // Set to a specific date: Jan 15, 2024 at 14:30:45
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('returns empty string when bypassPublishedDate is true', () => {
      const result = Filters.publishedDate({ bypassPublishedDate: true })
      expect(result).toBe('')
    })

    test('returns publishedAfter when getFutureContentOnly is true', () => {
      const result = Filters.publishedDate({ getFutureContentOnly: true })
      // Should be rounded to 14:01:00 (1 minute past the hour)
      expect(result).toBe('published_on >= "2024-01-15T14:01:00.000Z"')
    })

    test('returns publishedBefore when pullFutureContent is false', () => {
      const result = Filters.publishedDate({ pullFutureContent: false })
      expect(result).toBe('published_on <= "2024-01-15T14:01:00.000Z"')
    })

    test('returns empty string when pullFutureContent is true', () => {
      const result = Filters.publishedDate({ pullFutureContent: true })
      expect(result).toBe('')
    })

    test('applies prefix when provided', () => {
      const result = Filters.publishedDate({
        pullFutureContent: false,
        prefix: '@->',
      })
      expect(result).toBe('@->published_on <= "2024-01-15T14:01:00.000Z"')
    })
  })

  describe('Misc Utility Filters', () => {
    describe('includedFields', () => {
      test('processes non-empty array through filtersToGroq', () => {
        const fields = ['difficulty=easy', 'instructor=john']
        const result = Filters.includedFields(fields)
        // Should call filtersToGroq and return its output
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
      })

      test('returns empty string for empty array', () => {
        expect(Filters.includedFields([])).toBe('')
      })
    })

    describe('count', () => {
      test('wraps filter in count() syntax', () => {
        const filter = 'brand == "drumeo"'
        const result = Filters.count(filter)
        expect(result).toBe('count(*[brand == "drumeo"])')
      })

      test('works with complex filters', () => {
        const filter = Filters.combine(Filters.brand('drumeo'), Filters.type('song'))
        const result = Filters.count(filter)
        expect(result).toContain('count(*[')
        expect(result).toContain('brand == "drumeo"')
        expect(result).toContain('])')
      })
    })

    describe('progressIds', () => {
      test('uses idIn for non-empty array', () => {
        const ids = [123, 456, 789]
        const result = Filters.progressIds(ids)
        expect(result).toBe('railcontent_id in [123,456,789]')
      })

      test('returns empty string for empty array', () => {
        expect(Filters.progressIds([])).toBe('')
      })
    })
  })

  describe('Edge Cases', () => {
    test('combining filters with different prefixes', () => {
      const childFilter = Filters.asChild(Filters.brand('drumeo'))
      const parentFilter = Filters.asParent(Filters.type('song'))
      const regular = Filters.statusIn(['published'])

      const result = Filters.combine(childFilter, parentFilter, regular)

      expect(result).toContain('@->brand == "drumeo"')
      expect(result).toContain('^._type == "song"')
      expect(result).toContain("status in ['published']")
    })

    test('handles zero and negative IDs', () => {
      expect(Filters.railcontentId(0)).toBe('railcontent_id == 0')
      expect(Filters.railcontentId(-1)).toBe('railcontent_id == -1')
      expect(Filters.idIn([0, -1, 5])).toBe('railcontent_id in [0,-1,5]')
    })

    test('handles large arrays efficiently', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i)
      const result = Filters.idIn(largeArray)
      expect(result).toContain('railcontent_id in [')
      expect(result.split(',').length).toBe(100)
    })

    test('handles special characters in strings', () => {
      expect(Filters.brand("drumeo's")).toBe('brand == "drumeo\'s"')
      expect(Filters.titleMatch('Señor')).toBe('title match "Señor*"')
      expect(Filters.searchMatch('field', '日本語')).toBe('field match "日本語*"')
    })

    test('combining all filter types together', () => {
      const result = Filters.combine(
        Filters.brand('drumeo'),
        Filters.type('song'),
        Filters.statusIn(['published']),
        Filters.defined('thumbnail'),
        Filters.notDeprecated()
      )

      expect(result).toContain('brand == "drumeo"')
      expect(result).toContain('_type == "song"')
      expect(result).toContain("status in ['published']")
      expect(result).toContain('defined(thumbnail)')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('empty string handling in compose methods', () => {
      const result = Filters.combine(Filters.brand('drumeo'), '', Filters.type('song'))
      // Empty strings should be filtered out
      expect(result.split(' && ').length).toBe(2)
    })
  })
})
