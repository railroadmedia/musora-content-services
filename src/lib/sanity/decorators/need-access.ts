import { decorate, type Decoratable, type FieldDecorator } from './base'
import { getPermissionsAdapter, type UserPermissions } from '../../../services/permissions'

export const NEED_ACCESS_FIELD = 'need_access' as const

export interface AccessDecoratable extends Decoratable {
  permission_id?: number[]
  children?: AccessDecoratable[]
}

export type WithNeedAccess<T extends AccessDecoratable> = T & {
  [NEED_ACCESS_FIELD]: boolean
  children?: WithNeedAccess<NonNullable<T['children']>[number]>[]
}

export function accessDecorator(
  userPermissions: UserPermissions
): FieldDecorator<AccessDecoratable, boolean> {
  const adapter = getPermissionsAdapter()
  return {
    field: NEED_ACCESS_FIELD,
    compute: (item) => adapter.doesUserNeedAccess(item, userPermissions),
  }
}

export function decorateAccess<T extends AccessDecoratable>(
  items: T[],
  userPermissions: UserPermissions
): WithNeedAccess<T>[]
export function decorateAccess<T extends AccessDecoratable>(
  items: T,
  userPermissions: UserPermissions
): WithNeedAccess<T>
export function decorateAccess<T extends AccessDecoratable>(
  items: T | T[],
  userPermissions: UserPermissions
): WithNeedAccess<T> | WithNeedAccess<T>[] {
  const { field, compute } = accessDecorator(userPermissions)
  return decorate<AccessDecoratable, boolean>(items, field, compute) as
    | WithNeedAccess<T>
    | WithNeedAccess<T>[]
}
