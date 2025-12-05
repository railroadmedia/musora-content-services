import { getEligibleChildIds } from '../../src/services/awards/internal/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

describe('Award Calculations', () => {
  describe('getEligibleChildIds', () => {
    test('returns all child_ids from award definition', () => {
      const award = { child_ids: [1, 2, 3, 4] }
      expect(getEligibleChildIds(award)).toEqual([1, 2, 3, 4])
    })

    test('returns empty array for empty child_ids', () => {
      const award = { child_ids: [] }
      expect(getEligibleChildIds(award)).toEqual([])
    })

    test('returns empty array for undefined child_ids', () => {
      const award = {}
      expect(getEligibleChildIds(award)).toEqual([])
    })

    test('returns empty array for null child_ids', () => {
      const award = { child_ids: null }
      expect(getEligibleChildIds(award)).toEqual([])
    })
  })

})
