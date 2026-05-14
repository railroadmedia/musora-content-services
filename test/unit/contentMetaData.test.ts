import { processMetadata } from '@/contentMetaData'

describe('processMetadata', () => {
  test('returns null for unknown brand and type', () => {
    expect(processMetadata('unknown', 'unknown')).toBeNull()
  })

  test('returns null for unknown type on known brand', () => {
    expect(processMetadata('drumeo', 'unknown-type')).toBeNull()
  })

  test('returns expected shape for known brand and type', () => {
    const result = processMetadata('drumeo', 'lessons')

    expect(result).not.toBeNull()
    expect(result.type).toBe('lessons')
    expect(result.name).toBeDefined()
    expect(result.sort).toBeDefined()
    expect(result.tabs).toBeDefined()
    expect(Array.isArray(result.tabs)).toBe(true)
  })

  test('does not include filters when withFilters is false', () => {
    const result = processMetadata('drumeo', 'lessons')

    expect(result.filters).toBeUndefined()
  })

  test('includes filters when withFilters is true', () => {
    const result = processMetadata('drumeo', 'lessons', true)

    expect(result.filters).toBeDefined()
  })

  test('brand-specific filters differ between brands for the same type', () => {
    const drumeo = processMetadata('drumeo', 'lessons', true)
    const pianote = processMetadata('pianote', 'lessons', true)

    expect(JSON.stringify(drumeo.filters)).not.toBe(JSON.stringify(pianote.filters))
  })

  test('shared structure is consistent across brands for the same type', () => {
    const drumeo = processMetadata('drumeo', 'lessons')
    const pianote = processMetadata('pianote', 'lessons')

    expect(drumeo.type).toBe(pianote.type)
    expect(drumeo.name).toBe(pianote.name)
    expect(JSON.stringify(drumeo.tabs)).toBe(JSON.stringify(pianote.tabs))
  })

  test('songs tabs are brand-specific based on song types config', () => {
    const result = processMetadata('drumeo', 'songs')

    expect(result).not.toBeNull()
    expect(result.tabs.length).toBeGreaterThan(0)
    expect(result.tabs[0].name).toBe('For You')
  })
})
