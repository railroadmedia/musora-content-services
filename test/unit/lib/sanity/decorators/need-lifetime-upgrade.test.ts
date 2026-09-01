import {
  NEED_LIFETIME_UPGRADE_FIELD,
  lifetimeUpgradeDecorator,
  decorateLifetimeUpgrade,
} from '../../../../../src/lib/sanity/decorators/need-lifetime-upgrade'

const PLUS = 92
const LIFETIME = 108
const BASE = 91

const lifetimeBase = { permissions: [LIFETIME, BASE], isAdmin: false, isModerator: false, isABasicMember: true, hasAllContentAccess: false, isForumModerator: false, isCommentModerator: false }
const lifetimeBasePlus = { permissions: [LIFETIME, BASE, PLUS], isAdmin: false, isModerator: false, isABasicMember: false, hasAllContentAccess: false, isForumModerator: false, isCommentModerator: false }
const baseOnly = { permissions: [BASE], isAdmin: false, isModerator: false, isABasicMember: true, hasAllContentAccess: false, isForumModerator: false, isCommentModerator: false }

const plusGatedLocked = { permission_id: [BASE, PLUS], need_access: true, membership_tier: 'plus' }
const plusGatedUnlocked = { permission_id: [BASE, PLUS], need_access: false, membership_tier: 'plus' }

describe('need-lifetime-upgrade decorator', () => {
  describe('lifetimeUpgradeDecorator (factory)', () => {
    test('field is need_lifetime_upgrade', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeBase)
      expect(dec.field).toBe('need_lifetime_upgrade')
      expect(NEED_LIFETIME_UPGRADE_FIELD).toBe('need_lifetime_upgrade')
    })

    test('true for lifetime member on Plus-gated content they cannot access', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeBase)
      expect(dec.compute(plusGatedLocked)).toBe(true)
    })

    test('false when user already has Plus', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeBasePlus)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false when user does not have lifetime', () => {
      const dec = lifetimeUpgradeDecorator(baseOnly)
      expect(dec.compute(plusGatedLocked)).toBe(false)
    })

    test('false when user already has access to content (need_access false)', () => {
      const dec = lifetimeUpgradeDecorator(lifetimeBase)
      expect(dec.compute(plusGatedUnlocked)).toBe(false)
    })
  })

  describe('decorateLifetimeUpgrade', () => {
    test('decorates array of items', () => {
      const items = [plusGatedLocked, plusGatedUnlocked]
      const decorated = decorateLifetimeUpgrade(items, lifetimeBase)
      expect(decorated.map((i) => i.need_lifetime_upgrade)).toEqual([true, false])
    })

    test('decorates a single item', () => {
      const decorated = decorateLifetimeUpgrade(plusGatedLocked, lifetimeBase)
      expect(decorated.need_lifetime_upgrade).toBe(true)
    })

    test('decorates children recursively', () => {
      const tree = {
        permission_id: [BASE, PLUS],
        need_access: true,
        membership_tier: 'plus',
        children: [
          {
            permission_id: [BASE, PLUS],
            need_access: true,
            membership_tier: 'plus',
            children: [{ permission_id: [BASE, PLUS], need_access: true, membership_tier: 'plus' }],
          },
        ],
      }
      const decorated = decorateLifetimeUpgrade(tree, lifetimeBase)
      expect(decorated.need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].need_lifetime_upgrade).toBe(true)
      expect(decorated.children![0].children![0].need_lifetime_upgrade).toBe(true)
    })

    test('returns the same reference it was given', () => {
      const items = [plusGatedLocked]
      const decorated = decorateLifetimeUpgrade(items, lifetimeBase)
      expect(decorated).toBe(items)
    })
  })
})
