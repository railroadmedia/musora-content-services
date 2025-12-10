/**
 * Pure unit tests for Filters class synchronous methods
 * Tests GROQ filter generation without external dependencies
 */

import Filters from '../../src/lib/sanity/filter'

describe('Filters - Pure Synchronous Functions', () => {
  describe('Simple Filters', () => {
    describe('brand', () => {
      test('generates brand filter with double quotes', () => {
        expect(Filters.brand('drumeo')).toBe('brand == "drumeo"')
      })

      test('handles different brand names', () => {
        expect(Filters.brand('pianote')).toBe('brand == "pianote"')
        expect(Filters.brand('guitareo')).toBe('brand == "guitareo"')
      })
    })

    describe('type', () => {
      test('generates type filter', () => {
        expect(Filters.type('song')).toBe('_type == "song"')
      })
    })

    describe('slug', () => {
      test('generates slug filter with .current', () => {
        expect(Filters.slug('guitar-basics')).toBe('slug.current == "guitar-basics"')
      })
    })

    describe('railcontentId', () => {
      test('generates railcontent_id filter', () => {
        expect(Filters.railcontentId(12345)).toBe('railcontent_id == 12345')
      })
    })

    describe('statusIn', () => {
      test('generates status in array filter', () => {
        const result = Filters.statusIn(['published', 'scheduled'])
        expect(result).toBe("status in ['published','scheduled']")
      })

      test('handles empty array', () => {
        expect(Filters.statusIn([])).toBe('status in []')
      })
    })

    describe('idIn', () => {
      test('generates railcontent_id in array filter', () => {
        const result = Filters.idIn([123, 456, 789])
        expect(result).toBe('railcontent_id in [123,456,789]')
      })

      test('handles empty array', () => {
        expect(Filters.idIn([])).toBe('railcontent_id in []')
      })
    })

    describe('references', () => {
      test('generates references filter', () => {
        expect(Filters.references('abc123')).toBe('references("abc123")')
      })
    })

    describe('referencesIDWithFilter', () => {
      test('generates references with subquery filter', () => {
        const filter = 'brand == "drumeo"'
        expect(Filters.referencesIDWithFilter(filter)).toBe('references(*[brand == "drumeo"]._id)')
      })
    })

    describe('referencesParent', () => {
      test('generates parent reference filter', () => {
        expect(Filters.referencesParent()).toBe('references(^._id)')
      })
    })

    describe('referencesField', () => {
      test('generates field-based reference filter', () => {
        const result = Filters.referencesField('slug.current', 'john-doe')
        expect(result).toBe('references(*[slug.current == "john-doe"]._id)')
      })
    })

    describe('titleMatch', () => {
      test('generates title match filter with wildcard', () => {
        expect(Filters.titleMatch('guitar')).toBe('title match "guitar*"')
      })
    })

    describe('searchMatch', () => {
      test('generates search match filter with term', () => {
        const result = Filters.searchMatch('description', 'beginner')
        expect(result).toBe('description match "beginner*"')
      })

      test('returns empty string without term', () => {
        expect(Filters.searchMatch('description')).toBe('')
      })
    })

    describe('publishedBefore', () => {
      test('generates published_on <= filter', () => {
        const date = '2024-01-01T00:00:00.000Z'
        expect(Filters.publishedBefore(date)).toBe(`published_on <= "${date}"`)
      })
    })

    describe('publishedAfter', () => {
      test('generates published_on >= filter', () => {
        const date = '2024-01-01T00:00:00.000Z'
        expect(Filters.publishedAfter(date)).toBe(`published_on >= "${date}"`)
      })
    })

    describe('defined', () => {
      test('generates defined() filter', () => {
        expect(Filters.defined('thumbnail')).toBe('defined(thumbnail)')
      })
    })

    describe('notDefined', () => {
      test('generates !defined() filter', () => {
        expect(Filters.notDefined('thumbnail')).toBe('!defined(thumbnail)')
      })
    })
  })

  describe('Field Checking - notDeprecated', () => {
    test('generates filter without prefix', () => {
      expect(Filters.notDeprecated()).toBe('!defined(deprecated_railcontent_id)')
    })

    test('generates filter with empty string prefix', () => {
      expect(Filters.notDeprecated('')).toBe('!defined(deprecated_railcontent_id)')
    })

    test('generates filter with child prefix', () => {
      expect(Filters.notDeprecated('@->')).toBe('!defined(@->deprecated_railcontent_id)')
    })

    test('generates filter with parent prefix', () => {
      expect(Filters.notDeprecated('^.')).toBe('!defined(^.deprecated_railcontent_id)')
    })
  })

  describe('Prefix Modifiers', () => {
    describe('withPrefix', () => {
      test('applies child prefix to filter', () => {
        const filter = Filters.brand('drumeo')
        const result = Filters.withPrefix('@->', filter)
        expect(result).toBe('@->brand == "drumeo"')
      })

      test('applies parent prefix to filter', () => {
        const filter = Filters.type('song')
        const result = Filters.withPrefix('^.', filter)
        expect(result).toBe('^._type == "song"')
      })

      test('empty prefix returns original filter', () => {
        const filter = Filters.brand('drumeo')
        expect(Filters.withPrefix('', filter)).toBe(filter)
      })
    })

    describe('asChild', () => {
      test('applies child prefix to simple filter', () => {
        const result = Filters.asChild(Filters.brand('drumeo'))
        expect(result).toBe('@->brand == "drumeo"')
      })

      test('applies child prefix to statusIn filter', () => {
        const result = Filters.asChild(Filters.statusIn(['published']))
        expect(result).toBe("@->status in ['published']")
      })
    })

    describe('asParent', () => {
      test('applies parent prefix to filter', () => {
        const result = Filters.asParent(Filters.type('song'))
        expect(result).toBe('^._type == "song"')
      })
    })
  })

  describe('Composition Utilities', () => {
    describe('combine', () => {
      test('combines two filters with &&', () => {
        const result = Filters.combine(Filters.brand('drumeo'), Filters.type('song'))
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('combines multiple filters', () => {
        const result = Filters.combine(
          Filters.brand('drumeo'),
          Filters.type('song'),
          Filters.statusIn(['published'])
        )
        expect(result).toContain('brand == "drumeo"')
        expect(result).toContain('_type == "song"')
        expect(result).toContain("status in ['published']")
        expect(result.split(' && ')).toHaveLength(3)
      })

      test('filters out undefined, null, and false values', () => {
        const result = Filters.combine(
          Filters.brand('drumeo'),
          undefined,
          null,
          false,
          Filters.type('song')
        )
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('returns single filter without &&', () => {
        const result = Filters.combine(Filters.brand('drumeo'))
        expect(result).toBe('brand == "drumeo"')
      })

      test('returns empty string for all falsy values', () => {
        const result = Filters.combine(undefined, null, false)
        expect(result).toBe('')
      })
    })

    describe('combineOr', () => {
      test('wraps multiple filters in parentheses with ||', () => {
        const result = Filters.combineOr(Filters.type('song'), Filters.type('workout'))
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })

      test('single filter has no parentheses', () => {
        const result = Filters.combineOr(Filters.type('song'))
        expect(result).toBe('_type == "song"')
      })

      test('returns empty string for no filters', () => {
        expect(Filters.combineOr()).toBe('')
      })

      test('filters out falsy values', () => {
        const result = Filters.combineOr(
          undefined,
          Filters.type('song'),
          null,
          false,
          Filters.type('workout')
        )
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })
    })
  })

  describe('publishedDate', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      // Set to a specific date: Jan 15, 2024 at 14:30:45
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('returns empty string when bypassPublishedDate is true', () => {
      const result = Filters.publishedDate({ bypassPublishedDate: true })
      expect(result).toBe('')
    })

    test('returns publishedAfter when getFutureContentOnly is true', () => {
      const result = Filters.publishedDate({ getFutureContentOnly: true })
      // Should be rounded to 14:01:00 (1 minute past the hour)
      expect(result).toBe('published_on >= "2024-01-15T14:01:00.000Z"')
    })

    test('returns publishedBefore when pullFutureContent is false', () => {
      const result = Filters.publishedDate({ pullFutureContent: false })
      expect(result).toBe('published_on <= "2024-01-15T14:01:00.000Z"')
    })

    test('returns empty string when pullFutureContent is true', () => {
      const result = Filters.publishedDate({ pullFutureContent: true })
      expect(result).toBe('')
    })

    test('applies prefix when provided', () => {
      const result = Filters.publishedDate({
        pullFutureContent: false,
        prefix: '@->',
      })
      expect(result).toBe('@->published_on <= "2024-01-15T14:01:00.000Z"')
    })
  })

  describe('Misc Utility Filters', () => {
    describe('includedFields', () => {
      test('processes non-empty array through filtersToGroq', () => {
        const fields = ['difficulty=easy', 'instructor=john']
        const result = Filters.includedFields(fields)
        // Should call filtersToGroq and return its output
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
      })

      test('returns empty string for empty array', () => {
        expect(Filters.includedFields([])).toBe('')
      })
    })

    describe('count', () => {
      test('wraps filter in count() syntax', () => {
        const filter = 'brand == "drumeo"'
        const result = Filters.count(filter)
        expect(result).toBe('count(*[brand == "drumeo"])')
      })

      test('works with complex filters', () => {
        const filter = Filters.combine(Filters.brand('drumeo'), Filters.type('song'))
        const result = Filters.count(filter)
        expect(result).toContain('count(*[')
        expect(result).toContain('brand == "drumeo"')
        expect(result).toContain('])')
      })
    })

    describe('progressIds', () => {
      test('uses idIn for non-empty array', () => {
        const ids = [123, 456, 789]
        const result = Filters.progressIds(ids)
        expect(result).toBe('railcontent_id in [123,456,789]')
      })

      test('returns empty string for empty array', () => {
        expect(Filters.progressIds([])).toBe('')
      })
    })
  })

  describe('Edge Cases', () => {
    test('combining filters with different prefixes', () => {
      const childFilter = Filters.asChild(Filters.brand('drumeo'))
      const parentFilter = Filters.asParent(Filters.type('song'))
      const regular = Filters.statusIn(['published'])

      const result = Filters.combine(childFilter, parentFilter, regular)

      expect(result).toContain('@->brand == "drumeo"')
      expect(result).toContain('^._type == "song"')
      expect(result).toContain("status in ['published']")
    })

    test('handles zero and negative IDs', () => {
      expect(Filters.railcontentId(0)).toBe('railcontent_id == 0')
      expect(Filters.railcontentId(-1)).toBe('railcontent_id == -1')
      expect(Filters.idIn([0, -1, 5])).toBe('railcontent_id in [0,-1,5]')
    })

    test('handles large arrays efficiently', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i)
      const result = Filters.idIn(largeArray)
      expect(result).toContain('railcontent_id in [')
      expect(result.split(',').length).toBe(100)
    })

    test('handles special characters in strings', () => {
      expect(Filters.brand("drumeo's")).toBe('brand == "drumeo\'s"')
      expect(Filters.titleMatch('Señor')).toBe('title match "Señor*"')
      expect(Filters.searchMatch('field', '日本語')).toBe('field match "日本語*"')
    })

    test('combining all filter types together', () => {
      const result = Filters.combine(
        Filters.brand('drumeo'),
        Filters.type('song'),
        Filters.statusIn(['published']),
        Filters.defined('thumbnail'),
        Filters.notDeprecated()
      )

      expect(result).toContain('brand == "drumeo"')
      expect(result).toContain('_type == "song"')
      expect(result).toContain("status in ['published']")
      expect(result).toContain('defined(thumbnail)')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('empty string handling in compose methods', () => {
      const result = Filters.combine(Filters.brand('drumeo'), '', Filters.type('song'))
      // Empty strings should be filtered out
      expect(result.split(' && ').length).toBe(2)
    })
  })
})

// ============================================
// ASYNC TESTS - MOCK SETUP
// ============================================
import { getPermissionsAdapter } from '../../src/services/permissions/index'
import type { UserPermissions } from '../../src/services/permissions/PermissionsAdapter'

// Mock the permissions module
jest.mock('../../src/services/permissions/index')

// Predefined user profiles for V2 testing
const mockUsers = {
  admin: {
    isAdmin: true,
    permissions: [],
    isABasicMember: false,
  },
  free: {
    isAdmin: false,
    permissions: [],
    isABasicMember: false,
  },
  basicMember: {
    isAdmin: false,
    permissions: ['78', '91', '92'],
    isABasicMember: true,
  },
  plusMember: {
    isAdmin: false,
    permissions: ['78', '108', '91', '92'],
    isABasicMember: true,
  },
  ownedOnly: {
    isAdmin: false,
    permissions: ['100000234', '100000567'], // Owned content IDs: 234, 567
    isABasicMember: false,
  },
}

// Helper to create mock adapter with V2 logic
const createMockAdapter = (userData: UserPermissions) => {
  return {
    fetchUserPermissions: jest.fn().mockResolvedValue(userData),
    isAdmin: jest.fn((data) => data?.isAdmin ?? false),
    generatePermissionsFilter: jest.fn((data, options = {}) => {
      // V2 Adapter logic implementation
      if (data.isAdmin) return null

      const prefix = options.prefix || ''
      const userPermissionIds = data?.permissions ?? []

      // showOnlyOwnedContent: extract content IDs from permissions >= 100000000
      if (options.showOnlyOwnedContent) {
        const minContentPermissionId = 100000000
        const ownedContentIds = userPermissionIds
          .map((permId) => parseInt(permId) - minContentPermissionId)
          .filter((contentId) => contentId > 0)

        if (ownedContentIds.length === 0) {
          return `railcontent_id == null`
        }
        return ` railcontent_id in [${ownedContentIds.join(',')}] `
      }

      // showMembershipRestrictedContent: use membership_tier
      if (options.showMembershipRestrictedContent) {
        return ` ${prefix}membership_tier in ['plus','basic'] `
      }

      // Standard filter: no permissions OR user has matching permissions
      const clauses: string[] = []
      clauses.push(`(!defined(${prefix}permission_v2) || count(${prefix}permission_v2) == 0)`)

      if (userPermissionIds.length > 0) {
        const isDereferenced = prefix === '@->'
        if (isDereferenced) {
          clauses.push(
            `array::intersects(${prefix}permission_v2, [${userPermissionIds.join(',')}])`
          )
        } else {
          clauses.push(`array::intersects(permission_v2, [${userPermissionIds.join(',')}])`)
        }
      }

      return `(${clauses.join(' || ')})`
    }),
    getUserPermissionIds: jest.fn((data) => data?.permissions ?? []),
  }
}

// Helper to setup mock adapter
const setupMockAdapter = (userData: UserPermissions) => {
  const mockAdapter = createMockAdapter(userData)
  ;(getPermissionsAdapter as jest.Mock).mockReturnValue(mockAdapter)
  return mockAdapter
}

describe('Filters - Async Methods (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Async Composition Utilities', () => {
    describe('combineAsync', () => {
      test('combines mix of sync strings and async promises', async () => {
        const result = await Filters.combineAsync(
          Filters.brand('drumeo'),
          Promise.resolve(Filters.type('song'))
        )
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('handles all sync values', async () => {
        const result = await Filters.combineAsync(Filters.brand('drumeo'), Filters.type('song'))
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('handles all async values with Promise.all', async () => {
        const result = await Filters.combineAsync(
          Promise.resolve(Filters.brand('drumeo')),
          Promise.resolve(Filters.type('song'))
        )
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })

      test('filters out falsy values (undefined, null, false, empty)', async () => {
        const result = await Filters.combineAsync(
          Filters.brand('drumeo'),
          Promise.resolve(''),
          undefined,
          null,
          false,
          Filters.type('song')
        )
        expect(result).toBe('brand == "drumeo" && _type == "song"')
      })
    })

    describe('combineAsyncOr', () => {
      test('wraps multiple filters with OR and parentheses', async () => {
        const result = await Filters.combineAsyncOr(
          Promise.resolve(Filters.type('song')),
          Promise.resolve(Filters.type('workout'))
        )
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })

      test('single filter has no parentheses', async () => {
        const result = await Filters.combineAsyncOr(Promise.resolve(Filters.type('song')))
        expect(result).toBe('_type == "song"')
      })

      test('returns empty string for no filters', async () => {
        const result = await Filters.combineAsyncOr()
        expect(result).toBe('')
      })

      test('filters out falsy values', async () => {
        const result = await Filters.combineAsyncOr(
          undefined,
          Promise.resolve(Filters.type('song')),
          null,
          Promise.resolve(''),
          Filters.type('workout')
        )
        expect(result).toBe('(_type == "song" || _type == "workout")')
      })
    })
  })

  describe('permissions', () => {
    test('admin user bypasses permission filter', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.permissions()
      expect(result).toBe('')
    })

    test('free user with no permissions gets standard filter', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.permissions()
      expect(result).toContain('!defined(permission_v2)')
      expect(result).toContain('count(permission_v2) == 0')
    })

    test('user with permissions generates array::intersects filter', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.permissions()
      expect(result).toContain('array::intersects(permission_v2')
      expect(result).toContain('[78,91,92]')
    })

    test('showMembershipRestrictedContent uses membership_tier', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.permissions({
        showMembershipRestrictedContent: true,
      })
      expect(result).toContain('membership_tier')
      expect(result).toContain("['plus','basic']")
    })

    test('showOnlyOwnedContent extracts content IDs from permissions', async () => {
      setupMockAdapter(mockUsers.ownedOnly)
      const result = await Filters.permissions({
        showOnlyOwnedContent: true,
      })
      expect(result).toContain('railcontent_id in')
      expect(result).toContain('[234,567]')
    })

    test('showOnlyOwnedContent with no owned perms returns null filter', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.permissions({
        showOnlyOwnedContent: true,
      })
      expect(result).toBe('railcontent_id == null')
    })

    test('bypassPermissions returns empty string', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.permissions({ bypassPermissions: true })
      expect(result).toBe('')
    })

    test('applies child prefix to permission_v2 field', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.permissions({ prefix: '@->' })
      expect(result).toContain('@->permission_v2')
    })

    test('applies parent prefix to permission_v2 field', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.permissions({ prefix: '^.' })
      expect(result).toContain('^.permission_v2')
    })

    test('uses provided userData instead of fetching', async () => {
      const mockAdapter = setupMockAdapter(mockUsers.admin)
      const result = await Filters.permissions({
        userData: mockUsers.basicMember,
      })
      expect(mockAdapter.fetchUserPermissions).not.toHaveBeenCalled()
      expect(result).toContain('[78,91,92]')
    })

    test('calls generatePermissionsFilter with correct options', async () => {
      const mockAdapter = setupMockAdapter(mockUsers.basicMember)
      await Filters.permissions({
        prefix: '@->',
        showMembershipRestrictedContent: true,
      })
      expect(mockAdapter.generatePermissionsFilter).toHaveBeenCalledWith(
        mockUsers.basicMember,
        expect.objectContaining({
          prefix: '@->',
          showMembershipRestrictedContent: true,
        })
      )
    })

    test('prefix with showMembershipRestrictedContent', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.permissions({
        prefix: '@->',
        showMembershipRestrictedContent: true,
      })
      expect(result).toContain('@->membership_tier')
    })

    test('empty permissions array is handled', async () => {
      setupMockAdapter({ ...mockUsers.free, permissions: [] })
      const result = await Filters.permissions()
      expect(result).toContain('!defined(permission_v2)')
    })

    test('adapter returns null for admin', async () => {
      const mockAdapter = setupMockAdapter(mockUsers.admin)
      const result = await Filters.permissions()
      expect(mockAdapter.isAdmin).toHaveBeenCalledWith(mockUsers.admin)
      expect(result).toBe('')
    })

    test('null or undefined options handled gracefully', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.permissions({})
      expect(result).toBeDefined()
    })
  })

  describe('status', () => {
    test('admin user via fetchUserPermissions gets all statuses', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.status()
      expect(result).toContain('draft')
      expect(result).toContain('scheduled')
      expect(result).toContain('published')
      expect(result).toContain('archived')
      expect(result).toContain('unlisted')
    })

    test('config.isAdmin: true overrides user data', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.status({ isAdmin: true })
      expect(result).toContain('draft')
      expect(result).toContain('unlisted')
    })

    test('regular user gets published and scheduled only', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.status()
      expect(result).toContain('scheduled')
      expect(result).toContain('published')
      expect(result).not.toContain('draft')
    })

    test('isSingle: true adds unlisted and archived', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.status({ isSingle: true })
      expect(result).toContain('scheduled')
      expect(result).toContain('published')
      expect(result).toContain('unlisted')
      expect(result).toContain('archived')
      expect(result).not.toContain('draft')
    })

    test('explicit statuses override auto-determination', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.status({
        statuses: ['published', 'draft'],
      })
      expect(result).toBe("status in ['published','draft']")
    })

    test('empty statuses array triggers auto-determination', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.status({ statuses: [] })
      expect(result).toContain('scheduled')
      expect(result).toContain('published')
    })

    test('bypassStatuses returns empty string', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.status({ bypassStatuses: true })
      expect(result).toBe('')
    })

    test('applies prefix to status filter', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.status({ prefix: '@->' })
      expect(result).toContain('@->status')
    })

    test('prefix with explicit statuses', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.status({
        statuses: ['published'],
        prefix: '^.',
      })
      expect(result).toContain('^.status')
    })

    test('fetches user permissions when not admin', async () => {
      const mockAdapter = setupMockAdapter(mockUsers.basicMember)
      await Filters.status()
      expect(mockAdapter.fetchUserPermissions).toHaveBeenCalled()
    })

    test('admin detection via adapter.isAdmin()', async () => {
      const mockAdapter = setupMockAdapter(mockUsers.admin)
      const result = await Filters.status()
      expect(mockAdapter.isAdmin).toHaveBeenCalled()
      expect(result).toContain('draft')
    })

    test('isSingle with admin gets all statuses', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.status({ isSingle: true })
      expect(result).toContain('draft')
    })
  })

  describe('contentFilter', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('combines status + permissions + date + deprecated', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        pullFutureContent: false,
      })

      expect(result).toContain('status in')
      expect(result).toContain('permission_v2')
      expect(result).toContain('published_on <=')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('admin user gets minimal filter (status + date + deprecated)', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.contentFilter({
        pullFutureContent: false,
      })

      expect(result).toContain('draft')
      expect(result).toContain('published_on <=')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('bypassPermissions excludes permission filter', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        bypassPermissions: true,
        pullFutureContent: false,
      })

      expect(result).toContain('status in')
      expect(result).toContain('published_on <=')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('pullFutureContent: true excludes date filter', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        pullFutureContent: true,
      })

      expect(result).toContain('status in')
      expect(result).toContain('permission_v2')
      expect(result).not.toContain('published_on')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('bypassPublishedDate excludes date filter', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        bypassPublishedDate: true,
      })

      expect(result).not.toContain('published_on')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('showMembershipRestrictedContent affects permission filter', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.contentFilter({
        showMembershipRestrictedContent: true,
        pullFutureContent: true,
      })

      expect(result).toContain('membership_tier')
    })

    test('all bypasses returns only notDeprecated', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        bypassStatuses: true,
        bypassPermissions: true,
        bypassPublishedDate: true,
      })

      expect(result).toBe('!defined(deprecated_railcontent_id)')
    })

    test('combines with && separator', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        pullFutureContent: false,
      })

      const separatorCount = (result.match(/&&/g) || []).length
      expect(separatorCount).toBeGreaterThanOrEqual(3)
    })

    test('prefix is passed to all components', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        prefix: '@->',
        pullFutureContent: false,
      })

      expect(result).toContain('@->status')
      expect(result).toContain('@->permission_v2')
      expect(result).toContain('@->published_on')
      expect(result).toContain('@->deprecated_railcontent_id')
    })

    test('empty statuses with isSingle', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.contentFilter({
        isSingle: true,
        pullFutureContent: false,
      })

      expect(result).toContain('unlisted')
      expect(result).toContain('archived')
    })
  })

  describe('childFilter', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('applies @-> prefix to all components', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.childFilter({
        pullFutureContent: false,
      })

      expect(result).toContain('@->status')
      expect(result).toContain('@->permission_v2')
      expect(result).toContain('@->published_on')
      expect(result).toContain('@->deprecated_railcontent_id')
    })

    test('passes through config options', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.childFilter({
        bypassPermissions: true,
        pullFutureContent: false,
      })

      expect(result).toContain('@->status')
      expect(result).not.toContain('permission_v2')
    })

    test('works with admin user', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.childFilter()

      expect(result).toContain('@->status')
      expect(result).toContain('draft')
    })

    test('showMembershipRestrictedContent with child prefix', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.childFilter({
        showMembershipRestrictedContent: true,
      })

      expect(result).toContain('@->membership_tier')
    })

    test('isSingle with child prefix', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.childFilter({
        isSingle: true,
      })

      expect(result).toContain('unlisted')
      expect(result).toContain('@->status')
    })

    test('all components use child prefix', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.childFilter({
        pullFutureContent: false,
      })

      const prefixedStatus = result.match(/@->status in/g)
      expect(prefixedStatus).toBeTruthy()
    })
  })

  describe('parentFilter', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('applies ^. prefix to all components', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.parentFilter({
        pullFutureContent: false,
      })

      expect(result).toContain('^.status')
      expect(result).toContain('^.permission_v2')
      expect(result).toContain('^.published_on')
      expect(result).toContain('^.deprecated_railcontent_id')
    })

    test('passes through config options', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.parentFilter({
        bypassPermissions: true,
        pullFutureContent: false,
      })

      expect(result).toContain('^.status')
      expect(result).not.toContain('permission_v2')
    })

    test('works with admin user', async () => {
      setupMockAdapter(mockUsers.admin)
      const result = await Filters.parentFilter()

      expect(result).toContain('^.status')
      expect(result).toContain('draft')
    })

    test('showMembershipRestrictedContent with parent prefix', async () => {
      setupMockAdapter(mockUsers.free)
      const result = await Filters.parentFilter({
        showMembershipRestrictedContent: true,
      })

      expect(result).toContain('^.membership_tier')
    })

    test('isSingle with parent prefix', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.parentFilter({
        isSingle: true,
      })

      expect(result).toContain('unlisted')
      expect(result).toContain('^.status')
    })

    test('all components use parent prefix', async () => {
      setupMockAdapter(mockUsers.basicMember)
      const result = await Filters.parentFilter({
        pullFutureContent: false,
      })

      const prefixedStatus = result.match(/\^\.status in/g)
      expect(prefixedStatus).toBeTruthy()
    })
  })

  describe('Integration & Edge Cases', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T14:30:45.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('real-world: content list for free user', async () => {
      setupMockAdapter(mockUsers.free)

      const result = await Filters.contentFilter({
        pullFutureContent: false,
        showMembershipRestrictedContent: false,
      })

      expect(result).toContain('scheduled')
      expect(result).toContain('published')
      expect(result).toContain('!defined(permission_v2)')
      expect(result).toContain('published_on <=')
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })

    test('real-world: single content for plus member', async () => {
      setupMockAdapter(mockUsers.plusMember)

      const result = await Filters.contentFilter({
        isSingle: true,
        pullFutureContent: false,
      })

      expect(result).toContain('unlisted')
      expect(result).toContain('archived')
      expect(result).toContain('[78,108,91,92]')
    })

    test('real-world: admin panel with all content', async () => {
      setupMockAdapter(mockUsers.admin)

      const result = await Filters.contentFilter({
        pullFutureContent: true,
      })

      expect(result).toContain('draft')
    })

    test('concurrent contentFilter calls', async () => {
      setupMockAdapter(mockUsers.basicMember)

      const results = await Promise.all([
        Filters.contentFilter({ pullFutureContent: false }),
        Filters.contentFilter({ pullFutureContent: true }),
        Filters.contentFilter({ isSingle: true }),
      ])

      expect(results).toHaveLength(3)
      expect(results[0]).toContain('published_on <=')
      expect(results[1]).not.toContain('published_on')
      expect(results[2]).toContain('unlisted')
    })

    test('adapter throws error is handled', async () => {
      const mockAdapter = createMockAdapter(mockUsers.basicMember)
      mockAdapter.fetchUserPermissions.mockRejectedValue(new Error('Network error'))
      ;(getPermissionsAdapter as jest.Mock).mockReturnValue(mockAdapter)

      await expect(Filters.permissions()).rejects.toThrow('Network error')
    })

    test('snapshot: free user complete filter', async () => {
      setupMockAdapter(mockUsers.free)

      const result = await Filters.contentFilter({
        pullFutureContent: false,
        showMembershipRestrictedContent: false,
      })

      expect(result).toMatchSnapshot()
    })

    test('snapshot: admin complete filter', async () => {
      setupMockAdapter(mockUsers.admin)

      const result = await Filters.contentFilter({
        pullFutureContent: false,
      })

      expect(result).toMatchSnapshot()
    })

    test('empty user permissions handled gracefully', async () => {
      const emptyUser = {
        isAdmin: false,
        permissions: [],
        isABasicMember: false,
      }
      setupMockAdapter(emptyUser)

      const result = await Filters.contentFilter()
      expect(result).toBeTruthy()
      expect(result).toContain('!defined(deprecated_railcontent_id)')
    })
  })
})
