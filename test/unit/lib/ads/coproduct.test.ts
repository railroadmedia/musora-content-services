import { Coproduct, Left, Right } from '../../../../src/lib/ads/coproduct'

describe('Coproduct', () => {
  describe('construction and narrowing', () => {
    test('left is a Left', () => {
      const result = Coproduct.left<string, number>('boom')
      expect(result.isLeft()).toBe(true)
      expect(result.isRight()).toBe(false)
      expect(result).toBeInstanceOf(Left)
    })

    test('right is a Right', () => {
      const result = Coproduct.right<string, number>(42)
      expect(result.isRight()).toBe(true)
      expect(result.isLeft()).toBe(false)
      expect(result).toBeInstanceOf(Right)
    })
  })

  describe('map', () => {
    test('applies the function to a right value', () => {
      const result = Coproduct.right<string, number>(2).map((n) => n * 3)
      expect(result.drop()).toBe(6)
    })

    test('does not call the function on a left and preserves the error', () => {
      const fn = jest.fn()
      const result = Coproduct.left<string, number>('boom').map(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.isLeft()).toBe(true)
      expect(result.drop()).toBe('boom')
    })
  })

  describe('flatMap', () => {
    test('replaces a right with the returned coproduct', () => {
      const result = Coproduct.right<string, number>(2).flatMap((n) =>
        Coproduct.right<string, number>(n + 1)
      )
      expect(result.drop()).toBe(3)
    })

    test('lets the inner function fail the chain', () => {
      const result = Coproduct.right<string, number>(2).flatMap(() =>
        Coproduct.left<string, number>('inner')
      )
      expect(result.isLeft()).toBe(true)
      expect(result.drop()).toBe('inner')
    })

    test('does not call the function on a left', () => {
      const fn = jest.fn()
      const result = Coproduct.left<string, number>('boom').flatMap(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.drop()).toBe('boom')
    })
  })

  describe('mapAsync', () => {
    test('awaits the function and wraps the resolved value for a right', async () => {
      const result = await Coproduct.right<string, number>(2).mapAsync(async (n) => n * 3)
      expect(result.isRight()).toBe(true)
      expect(result.drop()).toBe(6)
    })

    test('does not call the function on a left and preserves the error', async () => {
      const fn = jest.fn()
      const result = await Coproduct.left<string, number>('boom').mapAsync(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.isLeft()).toBe(true)
      expect(result.drop()).toBe('boom')
    })

    test('returns a new instance rather than mutating', async () => {
      const original = Coproduct.right<string, number>(2)
      const mapped = await original.mapAsync(async (n) => n * 2)
      expect(mapped).not.toBe(original)
      expect(original.drop()).toBe(2)
    })

    test('propagates a rejection instead of converting it to a left', async () => {
      const failure = new Error('async boom')
      await expect(
        Coproduct.right<string, number>(2).mapAsync(async () => {
          throw failure
        })
      ).rejects.toBe(failure)
    })
  })

  describe('lmap and lflatMap', () => {
    test('lmap transforms a left value', () => {
      const result = Coproduct.left<string, number>('boom').lmap((e) => e.toUpperCase())
      expect(result.drop()).toBe('BOOM')
    })

    test('lmap leaves a right untouched', () => {
      const fn = jest.fn()
      const result = Coproduct.right<string, number>(42).lmap(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.drop()).toBe(42)
    })

    test('lflatMap can recover a left into a right', () => {
      const result = Coproduct.left<string, number>('boom').lflatMap(() =>
        Coproduct.right<string, number>(0)
      )
      expect(result.isRight()).toBe(true)
      expect(result.drop()).toBe(0)
    })
  })

  describe('fold', () => {
    test('runs the left branch for a left', () => {
      const result = Coproduct.left<string, number>('boom').fold(
        (e) => `error: ${e}`,
        (n) => `value: ${n}`
      )
      expect(result).toBe('error: boom')
    })

    test('runs the right branch for a right', () => {
      const result = Coproduct.right<string, number>(42).fold(
        (e) => `error: ${e}`,
        (n) => `value: ${n}`
      )
      expect(result).toBe('value: 42')
    })
  })

  describe('foldMap', () => {
    test('folds the left value into the accumulator', () => {
      const result = Coproduct.left<string, number>('boom').foldMap(
        'seen:',
        (acc, value) => `${acc}${value}`
      )
      expect(result).toBe('seen:boom')
    })

    test('folds the right value into the accumulator', () => {
      const result = Coproduct.right<string, number>(42).foldMap(
        'seen:',
        (acc, value) => `${acc}${value}`
      )
      expect(result).toBe('seen:42')
    })
  })

  describe('recover', () => {
    test('returns the fallback for a left', () => {
      expect(Coproduct.left<string, number>('boom').recover(0)).toBe(0)
    })

    test('returns the value for a right and ignores the fallback', () => {
      expect(Coproduct.right<string, number>(42).recover(0)).toBe(42)
    })
  })

  describe('tap and ltap', () => {
    test('tap visits a right value and returns the same instance', () => {
      const seen: number[] = []
      const right = Coproduct.right<string, number>(42)
      const result = right.tap((n) => seen.push(n))
      expect(seen).toEqual([42])
      expect(result).toBe(right)
    })

    test('tap does not visit a left', () => {
      const fn = jest.fn()
      Coproduct.left<string, number>('boom').tap(fn)
      expect(fn).not.toHaveBeenCalled()
    })

    test('ltap visits a left value and returns the same instance', () => {
      const seen: string[] = []
      const left = Coproduct.left<string, number>('boom')
      const result = left.ltap((e) => seen.push(e))
      expect(seen).toEqual(['boom'])
      expect(result).toBe(left)
    })

    test('ltap does not visit a right', () => {
      const fn = jest.fn()
      Coproduct.right<string, number>(42).ltap(fn)
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('drop', () => {
    test('unwraps either side', () => {
      expect(Coproduct.left<string, number>('boom').drop()).toBe('boom')
      expect(Coproduct.right<string, number>(42).drop()).toBe(42)
    })
  })

  describe('immutability', () => {
    test('map returns a new instance rather than mutating', () => {
      const original = Coproduct.right<string, number>(2)
      const mapped = original.map((n) => n * 2)
      expect(mapped).not.toBe(original)
      expect(original.drop()).toBe(2)
    })

    test('mapping a left returns a new Left carrying the same error', () => {
      const original = Coproduct.left<string, number>('boom')
      const mapped = original.map((n) => n * 2)
      expect(mapped).not.toBe(original)
      expect(mapped.drop()).toBe('boom')
    })
  })
})
