import { Brands } from '../../../src/lib/brands'
import { brandDocumentQuery, faqProjection, statsProjection } from '../../../src/services/marketing/marketing'

describe('faqProjection', () => {
  test('returns undefined when web-only questions should be included', () => {
    expect(faqProjection(true)).toBeUndefined()
  })

  test('filters out web_only questions when web-only should be excluded', () => {
    expect(faqProjection(false)).toEqual(['...', 'questions[!web_only]'])
  })
})

describe('statsProjection', () => {
  test('returns undefined for the musora brand', () => {
    expect(statsProjection(true)).toBeUndefined()
  })

  test('merges in musora total_student_count for non-musora brands', () => {
    const projection = statsProjection(false)

    expect(projection?.[0]).toBe('...')
    expect(projection?.[1]).toBe(
      '"total_student_count": *[_type == "stats" && brand == "musora"][0].total_student_count'
    )
  })
})

describe('brandDocumentQuery', () => {
  test('builds a filtered single-document query for the type and brand', () => {
    const built = brandDocumentQuery('faq', Brands.Drumeo).build()

    expect(built).toContain('*[_type == "faq" && brand == "drumeo"]')
    expect(built).toContain('[0]')
  })

  test('applies a projection when provided', () => {
    const built = brandDocumentQuery('faq', Brands.Drumeo, faqProjection(false)).build()

    expect(built).toContain('{ ..., questions[!web_only] }')
  })

  test('omits the projection clause when none is provided', () => {
    const built = brandDocumentQuery('stats', Brands.Musora).build()

    expect(built).not.toContain('{')
  })
})
