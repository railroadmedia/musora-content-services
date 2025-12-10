import { query } from '../../src/lib/sanity/query'

describe('Sanity Query Builder', () => {
  describe('Basic Query Building', () => {
    test('builds empty query', () => {
      const result = query().build()
      expect(result).toBe('*[]')
    })

    test('builds query with single filter', () => {
      const result = query().and('_type == "course"').build()
      expect(result).toBe('*[_type == "course"]')
    })

    test('builds query with multiple and filters', () => {
      const result = query().and('_type == "course"').and('brand == "drumeo"').build()
      expect(result).toBe('*[_type == "course" && brand == "drumeo"]')
    })

    test('builds query with three and filters', () => {
      const result = query()
        .and('_type == "course"')
        .and('brand == "drumeo"')
        .and('published == true')
        .build()
      expect(result).toBe('*[_type == "course" && brand == "drumeo" && published == true]')
    })
  })

  describe('OR Filters', () => {
    test('builds query with single or expression', () => {
      const result = query().or('brand == "drumeo"', 'brand == "pianote"').build()
      expect(result).toBe('*[(brand == "drumeo" || brand == "pianote")]')
    })

    test('builds query with multiple or expressions', () => {
      const result = query()
        .or('brand == "drumeo"', 'brand == "pianote"', 'brand == "guitareo"')
        .build()
      expect(result).toBe('*[((brand == "drumeo" || brand == "pianote") || brand == "guitareo")]')
    })

    test('combines and with or filters', () => {
      const result = query()
        .and('_type == "course"')
        .or('brand == "drumeo"', 'brand == "pianote"')
        .build()
      expect(result).toBe('*[_type == "course" && (brand == "drumeo" || brand == "pianote")]')
    })

    test('combines multiple and with or filters', () => {
      const result = query()
        .and('_type == "course"')
        .and('published == true')
        .or('brand == "drumeo"', 'brand == "pianote"')
        .build()
      expect(result).toBe(
        '*[_type == "course" && published == true && (brand == "drumeo" || brand == "pianote")]'
      )
    })

    test('handles single or expression', () => {
      const result = query().or('brand == "drumeo"').build()
      expect(result).toBe('*[brand == "drumeo"]')
    })

    test('handles empty or expressions', () => {
      const result = query().or().build()
      expect(result).toBe('*[]')
    })
  })

  describe('Ordering', () => {
    test('builds query with order', () => {
      const result = query().and('_type == "course"').order('publishedOn desc').build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('| order(publishedOn desc)')
    })

    test('builds query with order only', () => {
      const result = query().order('title asc').build()
      expect(result).toContain('*[]')
      expect(result).toContain('| order(title asc)')
    })

    test('overrides previous order when called multiple times', () => {
      const result = query()
        .and('_type == "course"')
        .order('publishedOn desc')
        .order('title asc')
        .build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('| order(title asc)')
      expect(result).not.toContain('publishedOn desc')
    })
  })

  describe('Slicing and Pagination', () => {
    test('builds query with range slice', () => {
      const result = query().and('_type == "course"').slice(0, 10).build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('[0...10]')
    })

    test('builds query with single index slice', () => {
      const result = query().and('_type == "course"').slice(5).build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('[5]')
    })

    test('builds query with first() helper', () => {
      const result = query().and('_type == "course"').first().build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('[0]')
    })

    test('overrides previous slice when called multiple times', () => {
      const result = query().and('_type == "course"').slice(0, 10).slice(10, 20).build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('[10...20]')
      expect(result).not.toContain('[0...10]')
    })

    test('handles slice with zero start', () => {
      const result = query().slice(0, 5).build()
      expect(result).toContain('[0...5]')
    })
  })

  describe('Projection (Select)', () => {
    test('builds query with single field selection', () => {
      const result = query().and('_type == "course"').select('_id').build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id }')
    })

    test('builds query with multiple field selections', () => {
      const result = query().and('_type == "course"').select('_id', 'title', 'brand').build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id, title, brand }')
    })

    test('builds query with select called multiple times', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id')
        .select('title')
        .select('brand')
        .build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id, title, brand }')
    })

    test('builds query with select only', () => {
      const result = query().select('_id', 'title').build()
      expect(result).toContain('*[]')
      expect(result).toContain('{ _id, title }')
    })

    test('handles empty select', () => {
      const result = query().and('_type == "course"').select().build()
      expect(result).toBe('*[_type == "course"]')
    })

    test('handles complex projection with nested fields', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id', '"instructor": instructor->name', '"lessons": lessons[]->title')
        .build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain(
        '{ _id, "instructor": instructor->name, "lessons": lessons[]->title }'
      )
    })
  })

  describe('Post Filters', () => {
    test('builds query with post filter', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id', 'title', '"lessonCount": count(lessons)')
        .postFilter('lessonCount > 5')
        .build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id, title, "lessonCount": count(lessons) }')
      expect(result).toContain('[lessonCount > 5]')
    })

    test('builds query with multiple post filters', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id', 'title', '"lessonCount": count(lessons)')
        .postFilter('lessonCount > 5')
        .postFilter('lessonCount < 20')
        .build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id, title, "lessonCount": count(lessons) }')
      expect(result).toContain('[lessonCount > 5 && lessonCount < 20]')
    })

    test('builds query with post filter only', () => {
      const result = query()
        .select('_id', '"lessonCount": count(lessons)')
        .postFilter('lessonCount > 5')
        .build()
      expect(result).toContain('*[]')
      expect(result).toContain('{ _id, "lessonCount": count(lessons) }')
      expect(result).toContain('[lessonCount > 5]')
    })
  })

  describe('Complex Query Combinations', () => {
    test('builds query with all features combined', () => {
      const result = query()
        .and('_type == "course"')
        .and('published == true')
        .or('brand == "drumeo"', 'brand == "pianote"')
        .select('_id', 'title', '"lessonCount": count(lessons)')
        .postFilter('lessonCount > 5')
        .order('publishedOn desc')
        .slice(0, 10)
        .build()
      expect(result).toContain(
        '*[_type == "course" && published == true && (brand == "drumeo" || brand == "pianote")]'
      )
      expect(result).toContain('{ _id, title, "lessonCount": count(lessons) }')
      expect(result).toContain('[lessonCount > 5]')
      expect(result).toContain('| order(publishedOn desc)')
      expect(result).toContain('[0...10]')
    })

    test('builds query with order and slice only', () => {
      const result = query().order('publishedOn desc').slice(0, 10).build()
      expect(result).toContain('*[]')
      expect(result).toContain('| order(publishedOn desc)')
      expect(result).toContain('[0...10]')
    })

    test('builds query with filter, order, and first', () => {
      const result = query()
        .and('_type == "course"')
        .and('brand == "drumeo"')
        .order('publishedOn desc')
        .first()
        .build()
      expect(result).toContain('*[_type == "course" && brand == "drumeo"]')
      expect(result).toContain('| order(publishedOn desc)')
      expect(result).toContain('[0]')
    })

    test('builds realistic content query', () => {
      const result = query()
        .and('_type in ["course", "play-along", "song"]')
        .and('!(_id in path("drafts.**"))')
        .and('published == true')
        .or('difficulty == "beginner"', 'difficulty == "intermediate"')
        .select('_id', 'title', 'brand', 'difficulty', 'publishedOn')
        .order('publishedOn desc')
        .slice(0, 20)
        .build()
      expect(result).toContain('*[_type in ["course", "play-along", "song"]')
      expect(result).toContain('!(_id in path("drafts.**"))')
      expect(result).toContain('published == true')
      expect(result).toContain('(difficulty == "beginner" || difficulty == "intermediate")')
      expect(result).toContain('{ _id, title, brand, difficulty, publishedOn }')
      expect(result).toContain('| order(publishedOn desc)')
      expect(result).toContain('[0...20]')
    })
  })

  describe('Method Chaining', () => {
    test('returns same builder instance for chaining', () => {
      const builder = query()
      const result1 = builder.and('_type == "course"')
      const result2 = result1.order('title')
      const result3 = result2.slice(0, 10)
      expect(result1).toBe(builder)
      expect(result2).toBe(builder)
      expect(result3).toBe(builder)
    })

    test('maintains state across chained calls', () => {
      const builder = query()
      builder.and('_type == "course"')
      builder.and('brand == "drumeo"')
      builder.order('publishedOn desc')
      const result = builder.build()
      expect(result).toContain('*[_type == "course" && brand == "drumeo"]')
      expect(result).toContain('| order(publishedOn desc)')
    })
  })

  describe('State Management', () => {
    test('exposes internal state via _state()', () => {
      const builder = query().and('_type == "course"').order('title').slice(0, 10)
      const state = builder._state()
      expect(state.filter).toBe('_type == "course"')
      expect(state.ordering).toBe('| order(title)')
      expect(state.slice).toBe('[0...10]')
      expect(state.projection).toBe('')
      expect(state.postFilter).toBe('')
    })

    test('state reflects all builder operations', () => {
      const builder = query()
        .and('_type == "course"')
        .or('brand == "drumeo"', 'brand == "pianote"')
        .select('_id', 'title')
        .postFilter('count > 5')
        .order('publishedOn desc')
        .slice(0, 10)
      const state = builder._state()
      expect(state.filter).toBe('_type == "course" && (brand == "drumeo" || brand == "pianote")')
      expect(state.ordering).toBe('| order(publishedOn desc)')
      expect(state.slice).toBe('[0...10]')
      expect(state.projection).toBe('_id, title')
      expect(state.postFilter).toBe('count > 5')
    })

    test('independent builder instances have separate state', () => {
      const builder1 = query().and('_type == "course"')
      const builder2 = query().and('_type == "song"')
      expect(builder1._state().filter).toBe('_type == "course"')
      expect(builder2._state().filter).toBe('_type == "song"')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty string filters', () => {
      const result = query().and('').build()
      expect(result).toBe('*[]')
    })

    test('handles empty string in or', () => {
      const result = query().or('', 'brand == "drumeo"').build()
      expect(result).toBe('*[brand == "drumeo"]')
    })

    test('handles all empty strings in or', () => {
      const result = query().or('', '', '').build()
      expect(result).toBe('*[]')
    })

    test('handles empty string in select', () => {
      const result = query().select('', '_id', '').build()
      expect(result).toContain('{ _id }')
    })

    test('handles calling first after slice', () => {
      const result = query().slice(0, 10).first().build()
      expect(result).toContain('[0]')
      expect(result).not.toContain('[0...10]')
    })

    test('builds valid query after multiple modifications', () => {
      const builder = query()
      builder.and('_type == "course"')
      builder.order('title asc')
      builder.order('publishedOn desc') // Override
      builder.slice(0, 10)
      builder.slice(5, 15) // Override
      const result = builder.build()
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('| order(publishedOn desc)')
      expect(result).toContain('[5...15]')
      expect(result).not.toContain('title asc')
      expect(result).not.toContain('[0...10]')
    })
  })

  describe('Whitespace and Formatting', () => {
    test('trims whitespace from built query', () => {
      const result = query().and('_type == "course"').build()
      expect(result).toBe('*[_type == "course"]')
      expect(result.startsWith(' ')).toBe(false)
      expect(result.endsWith(' ')).toBe(false)
    })

    test('maintains proper structure in complex queries', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id')
        .order('title')
        .slice(0, 10)
        .build()
      // Query should contain all expected parts
      expect(result).toContain('*[_type == "course"]')
      expect(result).toContain('{ _id }')
      expect(result).toContain('| order(title)')
      expect(result).toContain('[0...10]')
    })
  })

  describe('Real-World Query Patterns', () => {
    test('builds instructor content query', () => {
      const result = query()
        .and('_type == "instructor"')
        .and('!(_id in path("drafts.**"))')
        .select(
          '_id',
          'name',
          'biography',
          '"courseCount": count(*[_type == "course" && references(^._id)])'
        )
        .order('name asc')
        .build()
      expect(result).toContain('*[_type == "instructor"')
      expect(result).toContain('!(_id in path("drafts.**"))')
      expect(result).toContain('{ _id, name, biography')
      expect(result).toContain('| order(name asc)')
    })

    test('builds paginated search query', () => {
      const searchTerm = 'jazz'
      const result = query()
        .and('_type in ["course", "song", "play-along"]')
        .and(`title match "*${searchTerm}*"`)
        .and('published == true')
        .select('_id', 'title', '_type', 'brand')
        .order('_score desc')
        .slice(20, 40)
        .build()
      expect(result).toContain('title match "*jazz*"')
      expect(result).toContain('[20...40]')
    })

    test('builds content with aggregations and post-filter', () => {
      const result = query()
        .and('_type == "learning-path"')
        .select(
          '_id',
          'title',
          '"courses": courses[]->{ _id, title }',
          '"totalLessons": count(courses[]->lessons[])'
        )
        .postFilter('totalLessons >= 10')
        .postFilter('totalLessons <= 50')
        .order('totalLessons desc')
        .slice(0, 20)
        .build()
      expect(result).toContain('[totalLessons >= 10 && totalLessons <= 50]')
    })
  })

  describe('Monoid Laws', () => {
    test('and monoid - empty is identity (left)', () => {
      const builder1 = query().and('').and('_type == "course"')
      const builder2 = query().and('_type == "course"')
      expect(builder1._state().filter).toBe(builder2._state().filter)
    })

    test('and monoid - empty is identity (right)', () => {
      const builder1 = query().and('_type == "course"').and('')
      const builder2 = query().and('_type == "course"')
      expect(builder1._state().filter).toBe(builder2._state().filter)
    })

    test('and monoid - associativity', () => {
      const builder1 = query().and('a').and('b').and('c')
      expect(builder1._state().filter).toBe('a && b && c')
    })

    test('or monoid - empty is identity', () => {
      const builder1 = query().or('', 'brand == "drumeo"')
      const builder2 = query().or('brand == "drumeo"')
      expect(builder1._state().filter).toBe(builder2._state().filter)
    })

    test('or monoid - combines multiple expressions', () => {
      const builder = query().or('a', 'b', 'c')
      expect(builder._state().filter).toBe('((a || b) || c)')
    })

    test('projection monoid - accumulates fields', () => {
      const builder = query().select('a').select('b').select('c')
      expect(builder._state().projection).toBe('a, b, c')
    })

    test('projection monoid - handles empty strings', () => {
      const builder = query().select('', 'a', '', 'b')
      expect(builder._state().projection).toBe('a, b')
    })
  })

  describe('Query Correctness', () => {
    test('filter comes before projection', () => {
      const result = query().and('_type == "course"').select('_id').build()
      const filterIndex = result.indexOf('*[_type')
      const projectionIndex = result.indexOf('{ _id }')
      expect(filterIndex).toBeLessThan(projectionIndex)
    })

    test('projection comes before post-filter', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id', '"count": count(lessons)')
        .postFilter('count > 5')
        .build()
      const projectionIndex = result.indexOf('{ _id')
      const postFilterIndex = result.indexOf('[count > 5]')
      expect(projectionIndex).toBeLessThan(postFilterIndex)
    })

    test('ordering comes after post-filter', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id')
        .postFilter('count > 5')
        .order('title')
        .build()
      const postFilterIndex = result.indexOf('[count > 5]')
      const orderIndex = result.indexOf('| order')
      expect(postFilterIndex).toBeLessThan(orderIndex)
    })

    test('slice comes last', () => {
      const result = query()
        .and('_type == "course"')
        .select('_id')
        .order('title')
        .slice(0, 10)
        .build()
      const orderIndex = result.indexOf('| order')
      const sliceIndex = result.indexOf('[0...10]')
      expect(orderIndex).toBeLessThan(sliceIndex)
    })
  })
})
