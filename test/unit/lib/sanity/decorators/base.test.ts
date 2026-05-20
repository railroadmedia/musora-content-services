import { decorate, decorateAll, type Decoratable, type FieldDecorator } from '../../../../../src/lib/sanity/decorators/base'

describe('base decorator', () => {
  describe('decorate', () => {
    test('sets field on single object', () => {
      const item: Decoratable = { id: 1 }
      decorate(item, 'mark', () => 'A')
      expect(item.mark).toBe('A')
    })

    test('sets field on every item in array', () => {
      const items: Decoratable[] = [{ id: 1 }, { id: 2 }, { id: 3 }]
      decorate(items, 'mark', (i) => i.id)
      expect(items.map((i) => i.mark)).toEqual([1, 2, 3])
    })

    test('returns the same reference it was given', () => {
      const items: Decoratable[] = [{ id: 1 }]
      const result = decorate(items, 'mark', () => true)
      expect(result).toBe(items)
    })

    test('recurses children up to 3 levels deep', () => {
      const tree: Decoratable = {
        id: 1,
        children: [
          {
            id: 2,
            children: [
              {
                id: 3,
                children: [{ id: 4 }],
              },
            ],
          },
        ],
      }
      decorate(tree, 'visited', () => true)

      expect(tree.visited).toBe(true)
      const lvl1 = (tree.children as Decoratable[])[0]
      const lvl2 = (lvl1.children as Decoratable[])[0]
      const lvl3 = (lvl2.children as Decoratable[])[0]
      expect(lvl1.visited).toBe(true)
      expect(lvl2.visited).toBe(true)
      expect(lvl3.visited).toBeUndefined()
    })

    test('ignores missing or non-array children', () => {
      const item: Decoratable = { id: 1 }
      expect(() => decorate(item, 'mark', () => 1)).not.toThrow()
      expect(item.mark).toBe(1)

      const bad: Decoratable = { id: 1, children: 'not-an-array' as unknown as Decoratable[] }
      expect(() => decorate(bad, 'mark', () => 1)).not.toThrow()
      expect(bad.mark).toBe(1)
    })

    test('passes the visited item to the compute callback', () => {
      const item: Decoratable = { id: 7, label: 'x' }
      const compute = jest.fn(() => 'ok')
      decorate(item, 'mark', compute)
      expect(compute).toHaveBeenCalledTimes(1)
      expect(compute).toHaveBeenCalledWith(item)
    })
  })

  describe('decorateAll', () => {
    test('applies every decorator on a single walk', () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }] }]
      const a: FieldDecorator<Decoratable> = { field: 'a', compute: () => 'A' }
      const b: FieldDecorator<Decoratable> = { field: 'b', compute: () => 'B' }
      decorateAll(items, [a, b])

      expect(items[0].a).toBe('A')
      expect(items[0].b).toBe('B')
      const child = (items[0].children as Decoratable[])[0]
      expect(child.a).toBe('A')
      expect(child.b).toBe('B')
    })

    test('empty decorator list is a no-op', () => {
      const items: Decoratable[] = [{ id: 1 }]
      decorateAll(items, [])
      expect(Object.keys(items[0])).toEqual(['id'])
    })

    test('visits each item exactly once even with multiple decorators', () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }]
      const seen: number[] = []
      const probe: FieldDecorator<Decoratable> = {
        field: 'probe',
        compute: (item) => {
          seen.push(item.id as number)
          return true
        },
      }
      decorateAll(items, [probe, probe])
      expect(seen.sort()).toEqual([1, 1, 2, 2, 3, 3])
    })
  })
})
