import { initializeTestService } from '../../initializeTests.js'
import { PermissionsV2Adapter } from '../../../src/services/permissions/index.ts'

describe('Membership Checks', function() {
  beforeEach(() => {
    initializeTestService()
  })

  test('isUserFreeTier', () => {
    const { isUserFreeTier } = require('../../../src/services/permissions/index.ts')
    const baseUserPermissions = {
      permissions: [134, 91],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }
    const plusUserPermissions = {
      permissions: [134, 91, 92],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }
    const adminUserPermissions = {
      permissions: [],
      isAdmin: true,
      isModerator: false,
      isABasicMember: false,
    }
    const freeUserPermissions = {
      permissions: [134],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }

    expect(isUserFreeTier(baseUserPermissions)).toBe(false)
    expect(isUserFreeTier(plusUserPermissions)).toBe(false)
    expect(isUserFreeTier(adminUserPermissions)).toBe(false)
    expect(isUserFreeTier(freeUserPermissions)).toBe(true)
  })

  test('doesUserHaveMembership', () => {
    const { doesUserHaveMembership } = require('../../../src/services/permissions/index.ts')
    const baseUserPermissions = {
      permissions: [134, 91],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }
    const plusUserPermissions = {
      permissions: [134, 91, 92],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }
    const adminUserPermissions = {
      permissions: [],
      isAdmin: true,
      isModerator: false,
      isABasicMember: false,
    }
    const freeUserPermissions = {
      permissions: [134],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }

    expect(doesUserHaveMembership(baseUserPermissions)).toBe(true)
    expect(doesUserHaveMembership(plusUserPermissions)).toBe(true)
    expect(doesUserHaveMembership(adminUserPermissions)).toBe(true)
    expect(doesUserHaveMembership(freeUserPermissions)).toBe(false)
  })
})

describe('PermissionsV2Adapter.generatePermissionsFilter', function() {
  let adapter

  beforeEach(() => {
    initializeTestService()
    adapter = new PermissionsV2Adapter()
  })

  test('showOnlyOwnedContent', () => {
    const noPermsUser = {
      permissions: [],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }
    const contentUser = {
      permissions: [100000001, 100000002],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }
    const mixedUser = {
      permissions: [134, 91, 100000001],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }
    expect(
      adapter.generatePermissionsFilter(noPermsUser, { showOnlyOwnedContent: true })
    ).toBe('railcontent_id == 0')
    expect(
      adapter.generatePermissionsFilter(contentUser, { showOnlyOwnedContent: true })
    ).toBe(' railcontent_id in [1,2] ')
    expect(
      adapter.generatePermissionsFilter(mixedUser, { showOnlyOwnedContent: true })
    ).toBe(' railcontent_id in [1] ')
  })

  test('isAdmin', () => {
    const adminUser = {
      permissions: [],
      isAdmin: true,
      isModerator: false,
      isABasicMember: false,
    }

    expect(
      adapter.generatePermissionsFilter(adminUser)
    ).toBe(null)
  })

  test('user with no permissions gets no-permission-defined clause only', () => {
    const noPermsUser = {
      permissions: [],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }

    expect(
      adapter.generatePermissionsFilter(noPermsUser)
    ).toBe('((!defined(permission_v2) || count(permission_v2) == 0))')
  })

  test('user with permissions gets intersects check alongside no-permission clause', () => {
    const memberUser = {
      permissions: [134, 91, 92],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }

    expect(
      adapter.generatePermissionsFilter(memberUser)
    ).toBe('((!defined(permission_v2) || count(permission_v2) == 0) || array::intersects(permission_v2, [134,91,92]))')
  })

  test('showMembershipRestrictedContent', () => {
    const freeUser = {
      permissions: [134],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }
    const noPermsUser = {
      permissions: [],
      isAdmin: false,
      isModerator: false,
      isABasicMember: false,
    }

    expect(
      adapter.generatePermissionsFilter(freeUser, { showMembershipRestrictedContent: true })
    ).toBe(` (membership_tier in ['plus','basic'] || ((!defined(permission_v2) || count(permission_v2) == 0) || array::intersects(permission_v2, [134]))  )`)
    expect(
      adapter.generatePermissionsFilter(noPermsUser, { showMembershipRestrictedContent: true })
    ).toBe(` (membership_tier in ['plus','basic'] || ((!defined(permission_v2) || count(permission_v2) == 0))  )`)
  })

  test('standard prefix applied to permission_v2 field references but not intersects', () => {
    const memberUser = {
      permissions: [134, 91],
      isAdmin: false,
      isModerator: false,
      isABasicMember: true,
    }

    expect(
      adapter.generatePermissionsFilter(memberUser, { prefix: '^.' })
    ).toBe('((!defined(^.permission_v2) || count(^.permission_v2) == 0) || array::intersects(permission_v2, [134,91]))')
    expect(
      adapter.generatePermissionsFilter(memberUser, { prefix: '@->' })
    ).toBe('((!defined(@->permission_v2) || count(@->permission_v2) == 0) || array::intersects(@->permission_v2, [134,91]))')
  })

})
