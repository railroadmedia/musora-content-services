import { AsyncEither } from '../../../../src/lib/ads/async-either'
import { Either } from '../../../../src/lib/ads/either'

const right = <L, R>(value: R) => AsyncEither.of(Promise.resolve(Either.right<L, R>(value)))
const left = <L, R>(error: L) => AsyncEither.of(Promise.resolve(Either.left<L, R>(error)))

describe('AsyncEither', () => {
  describe('map', () => {
    test('applies the function to a right value', async () => {
      const result = await right<string, number>(2).map((n) => n * 3)
      expect(result.drop()).toBe(6)
    })

    test('does not call the function on a left', async () => {
      const fn = jest.fn()
      const result = await left<string, number>('boom').map(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.drop()).toBe('boom')
    })
  })

  describe('mapAsync', () => {
    test('awaits the function and keeps the chain going', async () => {
      const result = await right<string, number>(2)
        .mapAsync(async (n) => n * 3)
        .map((n) => n + 1)
      expect(result.drop()).toBe(7)
    })

    test('does not call the function on a left', async () => {
      const fn = jest.fn()
      const result = await left<string, number>('boom').mapAsync(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.isLeft()).toBe(true)
    })
  })

  describe('flatMap', () => {
    test('flattens the AsyncEither returned by the function', async () => {
      const result = await right<string, number>(2).flatMap((n) => right<string, number>(n * 3))
      expect(result.drop()).toBe(6)
    })

    test('keeps a left returned by the function', async () => {
      const result = await right<string, number>(2).flatMap(() => left<string, number>('inner'))
      expect(result.drop()).toBe('inner')
    })

    test('short-circuits on a left without calling the function', async () => {
      const fn = jest.fn()
      const result = await left<string, number>('boom').flatMap(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.drop()).toBe('boom')
    })
  })

  describe('lmap', () => {
    test('maps the left value', async () => {
      const result = await left<string, number>('boom').lmap((error) => error.toUpperCase())
      expect(result.drop()).toBe('BOOM')
    })

    test('leaves a right untouched', async () => {
      const fn = jest.fn()
      const result = await right<string, number>(2).lmap(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(result.drop()).toBe(2)
    })
  })

  describe('tap and ltap', () => {
    test('tap visits a right without modifying it', async () => {
      const seen: number[] = []
      const result = await right<string, number>(2).tap((n) => seen.push(n))
      expect(seen).toEqual([2])
      expect(result.drop()).toBe(2)
    })

    test('tap is skipped on a left', async () => {
      const fn = jest.fn()
      await left<string, number>('boom').tap(fn)
      expect(fn).not.toHaveBeenCalled()
    })

    test('ltap visits a left without modifying it', async () => {
      const seen: string[] = []
      const result = await left<string, number>('boom').ltap((error) => seen.push(error))
      expect(seen).toEqual(['boom'])
      expect(result.drop()).toBe('boom')
    })

    test('ltap is skipped on a right', async () => {
      const fn = jest.fn()
      await right<string, number>(2).ltap(fn)
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('fold', () => {
    test('calls onRight for a right', async () => {
      const result = await right<string, number>(2).fold(
        (error) => `error: ${error}`,
        (n) => `value: ${n}`
      )
      expect(result).toBe('value: 2')
    })

    test('calls onLeft for a left', async () => {
      const result = await left<string, number>('boom').fold(
        (error) => `error: ${error}`,
        (n) => `value: ${n}`
      )
      expect(result).toBe('error: boom')
    })
  })

  describe('recover', () => {
    test('returns the right value', async () => {
      expect(await right<string, number>(2).recover(0)).toBe(2)
    })

    test('returns the default value for a left', async () => {
      expect(await left<string, number>('boom').recover(0)).toBe(0)
    })
  })

  describe('lowering back to a promise', () => {
    test('unlift returns the pending Either untouched', async () => {
      const either = Either.right<string, number>(2)
      expect(await AsyncEither.of(Promise.resolve(either)).unlift()).toBe(either)
    })

    test('await resolves to the Either', async () => {
      const result = await right<string, number>(2)
      expect(result.isRight()).toBe(true)
    })

    test('Promise.all adopts it as a thenable', async () => {
      const [result, other] = await Promise.all([right<string, number>(2), 'x'])
      expect(result.drop()).toBe(2)
      expect(other).toBe('x')
    })

    test('an async function returns a real promise, not an AsyncEither', async () => {
      const fetch = async (): Promise<Either<string, number>> => right<string, number>(2)
      const returned = fetch()
      expect(returned).toBeInstanceOf(Promise)
      expect((await returned).drop()).toBe(2)
    })
  })

  describe('rejection', () => {
    test('a rejection inside mapAsync propagates to the awaiter', async () => {
      const chain = right<string, number>(2).mapAsync<number>(() =>
        Promise.reject(new Error('network'))
      )
      await expect(chain.recover(0)).rejects.toThrow('network')
    })
  })
})
