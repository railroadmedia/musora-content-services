import {
  decorate,
  decorateAll,
  decorateAsync,
  decorateAllAsync,
  type Decoratable,
  type FieldDecorator,
  type FieldDecoratorAsync,
} from '../../../../../src/lib/sanity/decorators/base'

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

    test('recurse:false decorator runs only at top level; recurse:true descends', () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }]
      const topOnlyHits: number[] = []
      const everyHits: number[] = []
      const topOnly: FieldDecorator<Decoratable> = {
        field: 'top',
        compute: (item) => {
          topOnlyHits.push(item.id as number)
          return true
        },
        recurse: false,
      }
      const every: FieldDecorator<Decoratable> = {
        field: 'every',
        compute: (item) => {
          everyHits.push(item.id as number)
          return true
        },
      }
      decorateAll(items, [topOnly, every])
      expect(topOnlyHits).toEqual([1])
      expect(everyHits.sort()).toEqual([1, 2, 3])
      expect(items[0].top).toBe(true)
      const child = (items[0].children as Decoratable[])[0]
      expect(child.top).toBeUndefined()
      expect(child.every).toBe(true)
    })

    test('all decorators recurse:false → children untouched, walk skipped', () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }] }]
      const seen: number[] = []
      const dec: FieldDecorator<Decoratable> = {
        field: 'mark',
        compute: (item) => {
          seen.push(item.id as number)
          return true
        },
        recurse: false,
      }
      decorateAll(items, [dec])
      expect(seen).toEqual([1])
      const child = (items[0].children as Decoratable[])[0]
      expect(child.mark).toBeUndefined()
    })
  })

  describe('decorateAsync', () => {
    test('sets resolved value on single object', async () => {
      const item: Decoratable = { id: 1 }
      await decorateAsync(item, 'mark', async () => 'A')
      expect(item.mark).toBe('A')
    })

    test('sets resolved value on every item in array', async () => {
      const items: Decoratable[] = [{ id: 1 }, { id: 2 }, { id: 3 }]
      await decorateAsync(items, 'mark', async (i) => i.id)
      expect(items.map((i) => i.mark)).toEqual([1, 2, 3])
    })

    test('returns same reference it was given', async () => {
      const items: Decoratable[] = [{ id: 1 }]
      const result = await decorateAsync(items, 'mark', async () => true)
      expect(result).toBe(items)
    })

    test('recurses children up to 3 levels deep', async () => {
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
      await decorateAsync(tree, 'visited', async () => true)

      expect(tree.visited).toBe(true)
      const lvl1 = (tree.children as Decoratable[])[0]
      const lvl2 = (lvl1.children as Decoratable[])[0]
      const lvl3 = (lvl2.children as Decoratable[])[0]
      expect(lvl1.visited).toBe(true)
      expect(lvl2.visited).toBe(true)
      expect(lvl3.visited).toBeUndefined()
    })

    test('propagates rejection from compute', async () => {
      const item: Decoratable = { id: 1 }
      const failing = decorateAsync(item, 'mark', async () => {
        throw new Error('boom')
      })
      await expect(failing).rejects.toThrow('boom')
    })
  })

  describe('decorateAllAsync', () => {
    test('applies every async decorator on a single walk', async () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }] }]
      const a: FieldDecoratorAsync<Decoratable> = {
        field: 'a',
        compute: async () => 'A',
      }
      const b: FieldDecoratorAsync<Decoratable> = {
        field: 'b',
        compute: async () => 'B',
      }
      await decorateAllAsync(items, [a, b])

      expect(items[0].a).toBe('A')
      expect(items[0].b).toBe('B')
      const child = (items[0].children as Decoratable[])[0]
      expect(child.a).toBe('A')
      expect(child.b).toBe('B')
    })

    test('empty decorator list is a no-op', async () => {
      const items: Decoratable[] = [{ id: 1 }]
      await decorateAllAsync(items, [])
      expect(Object.keys(items[0])).toEqual(['id'])
    })

    test('runs decorators for one item in parallel', async () => {
      const items: Decoratable[] = [{ id: 1 }]
      let active = 0
      let peak = 0
      const tracker = async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return true
      }
      await decorateAllAsync(items, [
        { field: 'a', compute: tracker },
        { field: 'b', compute: tracker },
        { field: 'c', compute: tracker },
      ])
      expect(peak).toBe(3)
    })

    test('runs items in parallel', async () => {
      const items: Decoratable[] = [{ id: 1 }, { id: 2 }, { id: 3 }]
      let active = 0
      let peak = 0
      const tracker = async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return true
      }
      await decorateAllAsync(items, [{ field: 'mark', compute: tracker }])
      expect(peak).toBe(3)
    })

    test('runs children in parallel', async () => {
      const items: Decoratable[] = [
        { id: 1, children: [{ id: 2 }, { id: 3 }, { id: 4 }] },
      ]
      let active = 0
      let peak = 0
      const tracker = async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return true
      }
      await decorateAllAsync(items, [{ field: 'mark', compute: tracker }])
      expect(peak).toBeGreaterThanOrEqual(3)
    })

    test('visits each item exactly once with multiple decorators', async () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }]
      const seen: number[] = []
      const probe: FieldDecoratorAsync<Decoratable> = {
        field: 'probe',
        compute: async (item) => {
          seen.push(item.id as number)
          return true
        },
      }
      await decorateAllAsync(items, [probe, probe])
      expect(seen.sort()).toEqual([1, 1, 2, 2, 3, 3])
    })

    test('rejects when any decorator throws', async () => {
      const items: Decoratable[] = [{ id: 1 }]
      const ok: FieldDecoratorAsync<Decoratable> = {
        field: 'ok',
        compute: async () => true,
      }
      const bad: FieldDecoratorAsync<Decoratable> = {
        field: 'bad',
        compute: async () => {
          throw new Error('nope')
        },
      }
      await expect(decorateAllAsync(items, [ok, bad])).rejects.toThrow('nope')
    })

    test('passes visited item to compute', async () => {
      const item: Decoratable = { id: 7, label: 'x' }
      const compute = jest.fn(async () => 'ok')
      await decorateAllAsync(item, [{ field: 'mark', compute }])
      expect(compute).toHaveBeenCalledTimes(1)
      expect(compute).toHaveBeenCalledWith(item)
    })

    test('recurse:false decorator runs only at top level; recurse:true descends', async () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }, { id: 3 }] }]
      const topOnlyHits: number[] = []
      const everyHits: number[] = []
      const topOnly: FieldDecoratorAsync<Decoratable> = {
        field: 'top',
        compute: async (item) => {
          topOnlyHits.push(item.id as number)
          return true
        },
        recurse: false,
      }
      const every: FieldDecoratorAsync<Decoratable> = {
        field: 'every',
        compute: async (item) => {
          everyHits.push(item.id as number)
          return true
        },
      }
      await decorateAllAsync(items, [topOnly, every])
      expect(topOnlyHits).toEqual([1])
      expect(everyHits.sort()).toEqual([1, 2, 3])
      const child = (items[0].children as Decoratable[])[0]
      expect(child.top).toBeUndefined()
      expect(child.every).toBe(true)
    })

    test('all async decorators recurse:false → children untouched', async () => {
      const items: Decoratable[] = [{ id: 1, children: [{ id: 2 }] }]
      const seen: number[] = []
      const dec: FieldDecoratorAsync<Decoratable> = {
        field: 'mark',
        compute: async (item) => {
          seen.push(item.id as number)
          return true
        },
        recurse: false,
      }
      await decorateAllAsync(items, [dec])
      expect(seen).toEqual([1])
      const child = (items[0].children as Decoratable[])[0]
      expect(child.mark).toBeUndefined()
    })
  })
})
