import { decorate, type FieldDecorator } from './base'
import { type UserPermissions } from '../../../services/permissions'
import { type AccessDecoratable } from './need-access'
import { MEMBERSHIP_PERMISSIONS } from '../../../constants/membership-permissions'

export const NEED_LIFETIME_UPGRADE_FIELD = 'need_lifetime_upgrade' as const

type LifetimeUpgradeDecoratable = AccessDecoratable & { need_access?: boolean; membership_tier?: string }

export type WithNeedLifetimeUpgrade<T extends AccessDecoratable> = T & {
  need_lifetime_upgrade: boolean
  children?: WithNeedLifetimeUpgrade<NonNullable<T['children']>[number]>[]
}

export function lifetimeUpgradeDecorator(
  userPermissions: UserPermissions
): FieldDecorator<LifetimeUpgradeDecoratable, typeof NEED_LIFETIME_UPGRADE_FIELD, boolean> {
  const userPermSet = new Set(userPermissions?.permissions ?? [])
  const hasLifetime = userPermSet.has(MEMBERSHIP_PERMISSIONS.lifetime)
  const hasPlus = userPermSet.has(MEMBERSHIP_PERMISSIONS.plus)

  return {
    field: NEED_LIFETIME_UPGRADE_FIELD,
    compute: (item) => {
      if (userPermissions?.hasAllContentAccess || !hasLifetime || hasPlus) return false
      if (!item.need_access) return false
      return item.membership_tier === 'plus'
      },
  }
}

export function decorateLifetimeUpgrade<T extends LifetimeUpgradeDecoratable>(
  items: T[],
  userPermissions: UserPermissions
): WithNeedLifetimeUpgrade<T>[]
export function decorateLifetimeUpgrade<T extends LifetimeUpgradeDecoratable>(
  items: T,
  userPermissions: UserPermissions
): WithNeedLifetimeUpgrade<T>
export function decorateLifetimeUpgrade<T extends LifetimeUpgradeDecoratable>(
  items: T | T[],
  userPermissions: UserPermissions
): WithNeedLifetimeUpgrade<T> | WithNeedLifetimeUpgrade<T>[] {
  const { field, compute } = lifetimeUpgradeDecorator(userPermissions)
  return decorate(items as T, field, compute) as
    | WithNeedLifetimeUpgrade<T>
    | WithNeedLifetimeUpgrade<T>[]
}
