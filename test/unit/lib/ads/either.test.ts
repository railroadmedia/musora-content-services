import { Either } from '../../../../src/lib/ads/either'
import { Left, Right } from '../../../../src/lib/ads/coproduct'

describe('Either', () => {
  test('left builds a Left carrying the error', () => {
    const result = Either.left<string, number>('boom')
    expect(result).toBeInstanceOf(Left)
    expect(result.isLeft()).toBe(true)
    expect(result.drop()).toBe('boom')
  })

  test('right builds a Right carrying the value', () => {
    const result = Either.right<string, number>(42)
    expect(result).toBeInstanceOf(Right)
    expect(result.isRight()).toBe(true)
    expect(result.drop()).toBe(42)
  })

  test('keeps the full Coproduct behaviour', () => {
    const result = Either.right<string, number>(2)
      .map((n) => n * 3)
      .fold(
        (error) => `error: ${error}`,
        (n) => `value: ${n}`
      )
    expect(result).toBe('value: 6')
  })
})
