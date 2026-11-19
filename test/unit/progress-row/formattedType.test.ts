jest.mock('../../../src/services/sanity.js', () => ({ getSanityDate: jest.fn() }))

import { entertainmentLessonTypes, getFormattedType } from '../../../src/contentTypeConfig.js'

describe('getFormattedType', () => {
  test('shows special content as a lesson', () => {
    expect(getFormattedType('special', 'drumeo')).toBe('lesson')
  })

  test.each(entertainmentLessonTypes)('gives the entertainment type %s a header', (type) => {
    expect(getFormattedType(type, 'drumeo')).not.toBeNull()
  })
})
