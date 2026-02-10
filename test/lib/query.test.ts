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
      const result = query().and('_type == "course"').slice(0, 10).slice(10, 10).build()
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
      builder.slice(5, 10) // Override
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
        .slice(20, 20)
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

  describe('Query Selector', () => {
    describe('Default Selector Behavior', () => {
      test('defaults to * selector when no argument provided', () => {
        const result = query().build()
        expect(result).toBe('*[]')
        expect(result.startsWith('*[')).toBe(true)
      })

      test('uses default * selector with filters', () => {
        const result = query().and('_type == "course"').build()
        expect(result).toBe('*[_type == "course"]')
        expect(result.startsWith('*[')).toBe(true)
      })

      test('state shows default * selector', () => {
        const builder = query()
        expect(builder._state().selector).toBe('*')
      })
    })

    describe('Setting Selector via Constructor', () => {
      test('accepts custom selector in constructor', () => {
        const result = query('*[_type == "course"]').build()
        expect(result).toBe('*[_type == "course"][]')
      })

      test('uses constructor selector with additional filters', () => {
        const result = query('*[_type == "course"]').and('published == true').build()
        expect(result).toBe('*[_type == "course"][published == true]')
      })

      test('uses constructor selector with projection', () => {
        const result = query('*[_type == "course"]').select('_id', 'title').build()
        expect(result).toContain('*[_type == "course"][]')
        expect(result).toContain('{ _id, title }')
      })

      test('uses constructor selector with ordering and slicing', () => {
        const result = query('*[_type == "course"]').order('publishedOn desc').slice(0, 10).build()
        expect(result).toContain('*[_type == "course"][]')
        expect(result).toContain('| order(publishedOn desc)')
        expect(result).toContain('[0...10]')
      })

      test('constructor selector with references', () => {
        const result = query('*[_type == "learning-path"]->courses[]').build()
        expect(result).toBe('*[_type == "learning-path"]->courses[][]')
      })

      test('constructor selector with nested query', () => {
        const selector =
          '*[_type == "instructor" && count(*[_type == "course" && references(^._id)]) > 5]'
        const result = query(selector).build()
        expect(result).toContain(selector)
        expect(result).toBe(`${selector}[]`)
      })

      test('state reflects constructor selector', () => {
        const builder = query('*[_type == "course"]')
        expect(builder._state().selector).toBe('*[_type == "course"]')
      })
    })

    describe('Setting Selector via Method', () => {
      test('changes selector via method call', () => {
        const result = query().selector('*[_type == "song"]').build()
        expect(result).toBe('*[_type == "song"][]')
      })

      test('selector method returns builder for chaining', () => {
        const builder = query()
        const result = builder.selector('*[_type == "course"]')
        expect(result).toBe(builder)
      })

      test('selector method allows full chaining', () => {
        const result = query()
          .selector('*[_type == "course"]')
          .and('published == true')
          .select('_id', 'title')
          .order('publishedOn desc')
          .slice(0, 10)
          .build()
        expect(result).toContain('*[_type == "course"][published == true]')
        expect(result).toContain('{ _id, title }')
        expect(result).toContain('| order(publishedOn desc)')
        expect(result).toContain('[0...10]')
      })

      test('selector method overrides default selector', () => {
        const builder = query()
        expect(builder._state().selector).toBe('*')
        builder.selector('*[_type == "course"]')
        expect(builder._state().selector).toBe('*[_type == "course"]')
      })

      test('selector method can be called before other operations', () => {
        const result = query().selector('*[_type == "course"]').and('brand == "drumeo"').build()
        expect(result).toBe('*[_type == "course"][brand == "drumeo"]')
      })

      test('selector method can be called after other operations', () => {
        const result = query().and('brand == "drumeo"').selector('*[_type == "course"]').build()
        expect(result).toBe('*[_type == "course"][brand == "drumeo"]')
      })

      test('state reflects method selector', () => {
        const builder = query().selector('*[_type == "song"]')
        expect(builder._state().selector).toBe('*[_type == "song"]')
      })
    })

    describe('Selector Override Behavior', () => {
      test('method selector overrides constructor selector', () => {
        const result = query('*[_type == "course"]').selector('*[_type == "song"]').build()
        expect(result).toBe('*[_type == "song"][]')
        expect(result).not.toContain('course')
      })

      test('last selector call wins with multiple method calls', () => {
        const builder = query()
          .selector('*[_type == "course"]')
          .selector('*[_type == "song"]')
          .selector('*[_type == "play-along"]')
        expect(builder._state().selector).toBe('*[_type == "play-along"]')
        expect(builder.build()).toBe('*[_type == "play-along"][]')
      })

      test('can override back to default selector', () => {
        const result = query('*[_type == "course"]').selector('*').and('published == true').build()
        expect(result).toBe('*[published == true]')
      })

      test('state updates correctly with overrides', () => {
        const builder = query('*[_type == "course"]')
        expect(builder._state().selector).toBe('*[_type == "course"]')
        builder.selector('*[_type == "song"]')
        expect(builder._state().selector).toBe('*[_type == "song"]')
        builder.selector('*')
        expect(builder._state().selector).toBe('*')
      })
    })

    describe('Selector with Complex Operations', () => {
      test('selector with all query features', () => {
        const result = query('*[_type == "learning-path"]->courses[]')
          .and('published == true')
          .or('difficulty == "beginner"', 'difficulty == "intermediate"')
          .select('_id', 'title', '"lessonCount": count(lessons)')
          .postFilter('lessonCount > 5')
          .order('publishedOn desc')
          .slice(0, 20)
          .build()
        expect(result).toContain('*[_type == "learning-path"]->courses[]')
        expect(result).toContain(
          '[published == true && (difficulty == "beginner" || difficulty == "intermediate")]'
        )
        expect(result).toContain('{ _id, title, "lessonCount": count(lessons) }')
        expect(result).toContain('[lessonCount > 5]')
        expect(result).toContain('| order(publishedOn desc)')
        expect(result).toContain('[0...20]')
      })

      test('selector with references and joins', () => {
        const selector = '*[_type == "course"]->instructor'
        const result = query(selector)
          .and('active == true')
          .select('_id', 'name', '"totalCourses": count(*[_type == "course" && references(^._id)])')
          .build()
        expect(result).toContain(selector)
        expect(result).toContain('[active == true]')
        expect(result).toContain('{ _id, name, "totalCourses": count')
      })

      test('selector with array dereferencing', () => {
        const selector = '*[_type == "playlist"]->items[]->content'
        const result = query(selector)
          .and('_type in ["course", "song"]')
          .select('_id', 'title', '_type')
          .build()
        expect(result).toContain(selector)
        expect(result).toContain('[_type in ["course", "song"]]')
      })

      test('complex selector with conditional logic', () => {
        const selector = '*[_type == "user" && _id == $userId]'
        const result = query(selector)
          .select('"enrollments": *[_type == "enrollment" && user._ref == ^._id]')
          .build()
        expect(result).toContain(selector)
        expect(result).toContain('{ "enrollments":')
      })
    })

    describe('Selector State Independence', () => {
      test('independent builder instances have independent selectors', () => {
        const builder1 = query('*[_type == "course"]')
        const builder2 = query('*[_type == "song"]')
        expect(builder1._state().selector).toBe('*[_type == "course"]')
        expect(builder2._state().selector).toBe('*[_type == "song"]')
      })

      test('modifying one builder does not affect another', () => {
        const builder1 = query()
        const builder2 = query()
        builder1.selector('*[_type == "course"]')
        expect(builder1._state().selector).toBe('*[_type == "course"]')
        expect(builder2._state().selector).toBe('*')
      })

      test('state references the same object', () => {
        const builder = query('*[_type == "course"]')
        const state1 = builder._state()
        builder.selector('*[_type == "song"]')
        const state2 = builder._state()
        expect(state1).toBe(state2)
        expect(state1.selector).toBe('*[_type == "song"]')
        expect(state2.selector).toBe('*[_type == "song"]')
      })
    })

    describe('Selector Edge Cases', () => {
      test('empty string selector in constructor defaults to *', () => {
        const result = query('').build()
        expect(result).toBe('*[]')
        const builder = query('')
        expect(builder._state().selector).toBe('*')
      })

      test('empty string selector via method sets empty selector', () => {
        const result = query().selector('').and('_type == "course"').build()
        expect(result).toBe('[_type == "course"]')
      })

      test('handles selector with special characters', () => {
        const selector = '*[title match "foo*bar" && _type == "course"]'
        const result = query(selector).build()
        expect(result).toContain(selector)
      })

      test('handles selector with parameterized queries', () => {
        const selector = '*[_type == $contentType && brand == $brand]'
        const result = query(selector).and('published == true').build()
        expect(result).toContain(selector)
        expect(result).toContain('[published == true]')
      })

      test('handles very long selector', () => {
        const selector =
          '*[_type == "course" && published == true && !(_id in path("drafts.**")) && brand in ["drumeo", "pianote"]]'
        const result = query(selector).select('_id').build()
        expect(result).toContain(selector)
        expect(result).toContain('{ _id }')
      })

      test('handles selector with nested brackets', () => {
        const selector = '*[_type == "course" && count(lessons[published == true]) > 5]'
        const result = query(selector).build()
        expect(result).toContain(selector)
      })
    })

    describe('Real-World Selector Use Cases', () => {
      test('querying referenced instructor from courses', () => {
        const result = query('*[_type == "course"]->instructor')
          .and('active == true')
          .select('_id', 'name', 'biography')
          .order('name asc')
          .build()
        expect(result).toContain('*[_type == "course"]->instructor')
        expect(result).toContain('[active == true]')
        expect(result).toContain('{ _id, name, biography }')
      })

      test('querying learning path courses', () => {
        const result = query(
          '*[_type == "learning-path-v2" && slug.current == $slug][0]->courses[]'
        )
          .and('published == true')
          .select('_id', 'title', 'difficulty')
          .build()
        expect(result).toContain(
          '*[_type == "learning-path-v2" && slug.current == $slug][0]->courses[]'
        )
      })

      test('querying user enrollments', () => {
        const result = query('*[_type == "enrollment" && user._ref == $userId]')
          .select(
            '_id',
            'enrolledAt',
            '"content": content->{ _id, title, _type }',
            '"progress": *[_type == "progress" && user._ref == $userId && content._ref == ^.content._ref][0]'
          )
          .order('enrolledAt desc')
          .slice(0, 50)
          .build()
        expect(result).toContain('*[_type == "enrollment" && user._ref == $userId]')
        expect(result).toContain('"progress":')
      })

      test('querying content with instructor filter', () => {
        const result = query('*[_type in ["course", "song"] && instructor._ref == $instructorId]')
          .and('published == true')
          .select('_id', 'title', '_type', 'publishedOn')
          .order('publishedOn desc')
          .build()
        expect(result).toContain(
          '*[_type in ["course", "song"] && instructor._ref == $instructorId]'
        )
      })

      test('querying pack contents', () => {
        const result = query('*[_type == "pack" && _id == $packId][0]->contents[]')
          .select('_id', 'title', '_type', '"thumbnail": thumbnail.asset->url')
          .build()
        expect(result).toContain('*[_type == "pack" && _id == $packId][0]->contents[]')
      })

      test('querying related content', () => {
        const result = query('*[_type == $contentType && references($contentId)]')
          .and('!(_id in path("drafts.**"))')
          .select('_id', 'title', '_type')
          .slice(0, 10)
          .build()
        expect(result).toContain('*[_type == $contentType && references($contentId)]')
        expect(result).toContain('!(_id in path("drafts.**"))')
      })
    })

    describe('Selector Query Structure Validation', () => {
      test('selector appears at start of built query', () => {
        const selector = '*[_type == "course"]'
        const result = query(selector).and('published == true').build()
        expect(result.indexOf(selector)).toBe(0)
      })

      test('selector followed by filter brackets', () => {
        const result = query('*[_type == "course"]').and('published == true').build()
        expect(result).toMatch(/^\*\[_type == "course"\]\[published == true\]/)
      })

      test('custom selector maintains proper query order', () => {
        const selector = '*[_type == "learning-path"]->courses[]'
        const result = query(selector)
          .and('published == true')
          .select('_id')
          .postFilter('count > 5')
          .order('title')
          .slice(0, 10)
          .build()

        const selectorIndex = result.indexOf(selector)
        const filterIndex = result.indexOf('[published == true]')
        const projectionIndex = result.indexOf('{ _id }')
        const postFilterIndex = result.indexOf('[count > 5]')
        const orderIndex = result.indexOf('| order')
        const sliceIndex = result.indexOf('[0...10]')

        expect(selectorIndex).toBe(0)
        expect(selectorIndex).toBeLessThan(filterIndex)
        expect(filterIndex).toBeLessThan(projectionIndex)
        expect(projectionIndex).toBeLessThan(postFilterIndex)
        expect(postFilterIndex).toBeLessThan(orderIndex)
        expect(orderIndex).toBeLessThan(sliceIndex)
      })
    })
  })
})
