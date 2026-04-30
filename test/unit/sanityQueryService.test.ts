import { initializeTestService } from '../initializeTests.js'
import { getSortOrder } from '../../src/services/sanity.js'
import { processMetadata } from '../../src/contentMetaData.js'
import { FilterBuilder } from '../../src/filterBuilder.js'

jest.mock('../../src/services/permissions/index.ts', () => ({
  ...jest.requireActual('../../src/services/permissions/index.ts'),
  getPermissionsAdapter: jest.fn().mockReturnValue({
    fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [108, 91, 92], isAdmin: false }),
    isAdmin: jest.fn().mockReturnValue(false),
    generatePermissionsFilter: jest.fn().mockReturnValue(
      `(!defined(permission_v2) || array::intersects(permission_v2, [108,91,92]))`
    ),
  }),
}))

describe('Filter Builder', function() {
  beforeEach(() => {
    initializeTestService()
  })

  test('baseConstructor', async () => {
    const filter = 'railcontent_id = 111'
    let builder = new FilterBuilder(filter, { bypassPermissions: true })
    let finalFilter = await builder.buildFilter(filter)
    let clauses = spliceFilterForAnds(finalFilter)
    // bypassPermissions: true + default statuses auto-sets pullFutureContent: true via getFutureScheduledContentsOnly
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')

    builder = new FilterBuilder('', { bypassPermissions: true })
    finalFilter = await builder.buildFilter(filter)
    clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] status in [...], [1] !defined(deprecated_railcontent_id)
    expect(clauses[0].field).toBe('status')
    expect(clauses[0].operator).toBe('in')
    expect(clauses[1].phrase).toBe('!defined(deprecated_railcontent_id)')
  })

  test('withOnlyFilterAvailableStatuses', async () => {
    const filter = 'railcontent_id = 111'
    const builder = FilterBuilder.withOnlyFilterAvailableStatuses(filter, ['published', 'unlisted'], true)
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id), [3] published_on <=
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[1].condition).toBe(`['published','unlisted']`)
    expect(clauses[3].field).toBe('published_on')
  })

  test('withContentStatusAndFutureScheduledContent', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter, {
      availableContentStatuses: ['published', 'unlisted', 'scheduled'], getFutureScheduledContentsOnly: true,
    })
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    // pullFutureContent is set true by getFutureScheduledContentsOnly so no published_on <= clause
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[1].condition).toBe(`['published','unlisted','scheduled']`)
  })

  test('withUserPermissions', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter)
    const finalFilter = await builder.buildFilter()
    // permissions from initializeTestService: [108, 91, 92]
    // adapter wraps as: (!defined(permission_v2) || array::intersects(...))
    const expected = `(!defined(permission_v2) || array::intersects(permission_v2, [108,91,92]))`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeTruthy()
  })

  test('withUserPermissionsForPlusUser', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter)
    const finalFilter = await builder.buildFilter()
    // permissions from initializeTestService: [108, 91, 92]
    // adapter wraps as: (!defined(permission_v2) || array::intersects(...))
    const expected = `(!defined(permission_v2) || array::intersects(permission_v2, [108,91,92]))`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeTruthy()
  })

  test('withPermissionBypass', async () => {
    const filter = 'railcontent_id = 111'
    const builder = new FilterBuilder(filter, {
      bypassPermissions: true, pullFutureContent: false,
    })
    const finalFilter = await builder.buildFilter()
    const clauses = spliceFilterForAnds(finalFilter)
    // bypassPermissions: true skips the permission clause entirely
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    const expected = `(!defined(permission_v2) || array::intersects(permission_v2, [108,91,92]))`
    const isMatch = finalFilter.includes(expected)
    expect(isMatch).toBeFalsy()
    expect(clauses[0].field).toBe('railcontent_id')
    expect(clauses[1].field).toBe('status')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')
  })

  test('withPublishOnRestrictions', async () => {
    const filter = 'railcontent_id = 111'
    let builder = new FilterBuilder(filter, {
      pullFutureContent: true, bypassPermissions: true,
    })

    let finalFilter = await builder.buildFilter()
    let clauses = spliceFilterForAnds(finalFilter)
    // pullFutureContent: true — _applyPublishingDateRestrictions does nothing (else branch)
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id)
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[1].field).toBe('status')
    expect(clauses[1].operator).toBe('in')
    expect(clauses[2].phrase).toBe('!defined(deprecated_railcontent_id)')

    builder = new FilterBuilder(filter, {
      getFutureContentOnly: true, bypassPermissions: true,
    })
    finalFilter = await builder.buildFilter()
    clauses = spliceFilterForAnds(finalFilter)
    // getFutureContentOnly: true — published_on >= is appended
    // clauses: [0] railcontent_id = 111, [1] status in [...], [2] !defined(deprecated_railcontent_id), [3] published_on >=
    expect(clauses[0].phrase).toBe(filter)
    expect(clauses[3].field).toBe('published_on')
    expect(clauses[3].operator).toBe('>=')
  })

  function spliceFilterForAnds(filter: string): {
    phrase: string;
    field: string;
    operator: string;
    condition: string }[] {
    // this will not correctly split complex filters with && and || conditions.
    let phrases = filter.split(' && ')
    let clauses = []
    phrases.forEach((phrase) => {
      let field = phrase.substring(0, phrase.indexOf(' '))
      //if(field.charAt(0) === '(' ) field = field.substring(1);
      const temp = phrase.substring(phrase.indexOf(' ') + 1)
      const operator = temp.substring(0, temp.indexOf(' '))
      let condition = temp.substring(temp.indexOf(' ') + 1)
      //if(condition.charAt(condition.length) === ')') condition = condition.slice(-1);
      clauses.push({ phrase, field, operator, condition })
    })
    return clauses
  }
})

describe('Sanity Queries', function() {
  beforeEach(() => {
    initializeTestService()
  })

  test('getSortOrder', () => {
    let sort = getSortOrder()
    expect(sort).toBe('published_on desc')
    sort = getSortOrder('published_on')
    expect(sort).toBe('published_on asc')
    sort = getSortOrder('recommended')
    expect(sort).toBe('published_on desc')
    sort = getSortOrder('slug')
    expect(sort).toBe('!defined(title_for_sort), title_for_sort asc, !defined(title), lower(title) asc')
    sort = getSortOrder('-slug')
    expect(sort).toBe('!defined(title_for_sort), title_for_sort desc, !defined(title), lower(title) desc')
    sort = getSortOrder('-slug', 'drumeo', true)
    expect(sort).toBe('name desc')
    sort = getSortOrder('popularity')
    expect(sort).toBe('popularity asc')
    sort = getSortOrder('-popularity')
    expect(sort).toBe('coalesce(popularity, -1) desc')
    sort = getSortOrder('popularity', 'drumeo', 'artist')
    expect(sort).toBe('popularity.drumeo asc')
    sort = getSortOrder('-popularity', 'drumeo', 'genre')
    expect(sort).toBe('coalesce(popularity.drumeo, -1) desc')
  })

  test('invalidContentType', async () => {
    const metaData = processMetadata('guitareo', 'not a real type')
    expect(metaData).toBeNull()
  })
})
