import {
  NEED_LIFETIME_UPGRADE_FIELD,
  lifetimeUpgradeDecorator,
  decorateLifetimeUpgrade,
} from '../../../../../src/lib/sanity/decorators/need-lifetime-upgrade'

const PLUS = 92
const LIFETIME = 108
const BASE = 91

const lifetimeOnly = { permissions: [LIFETIME], isAdmin: false, isModerator: false, isABasicMember: false }
const lifetimePlus = { permissions: [LIFETIME, PLUS], isAdmin: false, isModerator: false, isABasicMember: false }
const plusOnly = { permissions: [PLUS], isAdmin: false, isModerator: false, isABasicMember: false }
const baseOnly = { permissions: [BASE], isAdmin: false, isModerator: false, isABasicMember: false }
const admin = { permissions: [LIFETIME], isAdmin: true, isModerator: false, isABasicMember: false }

const plusGatedLocked = { permission_id: [PLUS], need_access: true }
const plusGatedUnlocked = { permission_id: [PLUS], need_access: false }
const baseGatedLocked = { permission_id: [BASE], need_access: true }

describe('need-lifetime-upgrade decorator', () => {
  describe('lifetimeUpgradeDecorator (factory)', () => {
    test('field is need_lifetime_upgrade', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnly)
      expect(dec.field).toBe('need_lifetime_upgrade')
      expect(NEED_LIFETIME_UPGRADE_FIELD).toBe('need_lifetime_upgrade')
    })

    test('true for lifetime member on Plus-gated content they cannot access', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnly)
      expect(dec.compute(plusGatedLocked)).toBe(true)
    })

    test('false when user already has Plus', () => {
      const dec = lifetimeUpgradeDecorator(lifetimePlus)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false when user does not have lifetime', () => {
      const dec = lifetimeUpgradeDecorator(baseOnly)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false for Plus-only member', () => {
      const dec = lifetimeUpgradeDecorator(plusOnly)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false for admin', () => {
      const dec = lifetimeUpgradeDecorator(admin)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false when content does not require Plus', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnly)
      expect(dec.compute(baseGatedLocked)).toBe(false)
    })

    test('false when user already has access to content (need_access false)', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeOnly)
      expect(dec.compute(plusGatedUnlocked)).toBe(false)
    })

    test('false when userPermissions is null', () => {
      const dec = lifetimeUpgradeDecorator(null as any)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })
  })

  describe('decorateLifetimeUpgrade', () => {
    test('decorates array of items', () => {
      const items = [plusGatedLocked, baseGatedLocked, plusGatedUnlocked]
      const decorated = decorateLifetimeUpgrade(items, lifetimeOnly)
      expect(decorated.map((i) => i.need_lifetime_upgrade)).toEqual([true, false, false])
    })

    test('decorates a single item', () => {
      const decorated = decorateLifetimeUpgrade(plusGatedLocked, lifetimeOnly)
      expect(decorated.need_lifetime_upgrade).toBe(true)
    })

    test('decorates children recursively', () => {
      const tree = {
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
      const decorated = decorateLifetimeUpgrade(tree, lifetimeOnly)
      expect(decorated.need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].children![0].need_lifetime_upgrade).toBe(true)
    })

    test('returns the same reference it was given', () => {
      const items = [plusGatedLocked]
      const decorated = decorateLifetimeUpgrade(items, lifetimeOnly)
      expect(decorated).toBe(items)
    })
  })
})
