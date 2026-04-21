import { initializeTestService } from '../../initializeTests.js'

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
