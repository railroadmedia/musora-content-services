import {
  NEED_LIFETIME_UPGRADE_FIELD,
  lifetimeUpgradeDecorator,
  decorateLifetimeUpgrade,
  type WithNeedLifetimeUpgrade,
} from '../../../../../src/lib/sanity/decorators/need-lifetime-upgrade'
import { type AccessDecoratable } from '../../../../../src/lib/sanity/decorators/need-access'

const PLUS = 92
const LIFETIME = 108
const BASE = 91

const lifetimeOnlyPerms = { permissions: [LIFETIME], isAdmin: false, isModerator: false, isABasicMember: false }
const lifetimePlusPerms = { permissions: [LIFETIME, PLUS], isAdmin: false, isModerator: false, isABasicMember: false }
const plusOnlyPerms = { permissions: [PLUS], isAdmin: false, isModerator: false, isABasicMember: false }
const basePerms = { permissions: [BASE], isAdmin: false, isModerator: false, isABasicMember: false }
const adminPerms = { permissions: [LIFETIME], isAdmin: true, isModerator: false, isABasicMember: false }

const plusContent: AccessDecoratable = { permission_id: [PLUS], need_access: true }
const baseContent: AccessDecoratable = { permission_id: [BASE], need_access: true }
const freeContent: AccessDecoratable = { permission_id: [], need_access: false }

describe('need-lifetime-upgrade decorator', () => {
  describe('lifetimeUpgradeDecorator (factory)', () => {
    test('field is need_lifetime_upgrade', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnlyPerms)
      expect(dec.field).toBe('need_lifetime_upgrade')
      expect(NEED_LIFETIME_UPGRADE_FIELD).toBe('need_lifetime_upgrade')
    })

    test('returns true for lifetime member on Plus-gated content they cannot access', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnlyPerms)
      expect(dec.compute(plusContent)).toBe(true)
    })

    test('returns false when user already has Plus', () => {
      const dec = lifetimeUpgradeDecorator(lifetimePlusPerms)
      expect(dec.compute(plusContent)).toBe(false)
    })

    test('returns false when user does not have lifetime', () => {
      const dec = lifetimeUpgradeDecorator(basePerms)
      expect(dec.compute(plusContent)).toBe(false)
    })

    test('returns false for Plus-only member', () => {
      const dec = lifetimeUpgradeDecorator(plusOnlyPerms)
      expect(dec.compute(plusContent)).toBe(false)
    })

    test('returns false for admin', () => {
      const dec = lifetimeUpgradeDecorator(adminPerms)
      expect(dec.compute(plusContent)).toBe(false)
    })

    test('returns false when content does not require Plus', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnlyPerms)
      expect(dec.compute(baseContent)).toBe(false)
    })

    test('returns false when content is free (need_access false)', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnlyPerms)
      expect(dec.compute(freeContent)).toBe(false)
    })

    test('returns false when userPermissions is null', () => {
      const dec = lifetimeUpgradeDecorator(null as any)
      expect(dec.compute(plusContent)).toBe(false)
    })
  })

  describe('decorateLifetimeUpgrade', () => {
    test('decorates array of items', () => {
      const items: AccessDecoratable[] = [plusContent, baseContent, freeContent]
      const decorated = decorateLifetimeUpgrade(items, lifetimeOnlyPerms)
      expect(decorated.map((i) => i.need_lifetime_upgrade)).toEqual([true, false, false])
    })

    test('decorates a single item', () => {
      const decorated = decorateLifetimeUpgrade(plusContent, lifetimeOnlyPerms)
      expect(decorated.need_lifetime_upgrade).toBe(true)
    })

    test('decorates children recursively', () => {
      const tree: AccessDecoratable = {
        permission_id: [PLUS],
        need_access: true,
        children: [
          {
            permission_id: [PLUS],
            need_access: true,
            children: [{ permission_id: [PLUS], need_access: true }],
          },
        ],
      }
      const decorated = decorateLifetimeUpgrade(tree, lifetimeOnlyPerms) as WithNeedLifetimeUpgrade<AccessDecoratable>
      expect(decorated.need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].children![0].need_lifetime_upgrade).toBe(true)
    })

    test('returns the same reference it was given', () => {
      const items: AccessDecoratable[] = [plusContent]
      const decorated = decorateLifetimeUpgrade(items, lifetimeOnlyPerms)
      expect(decorated).toBe(items)
    })
  })
})
