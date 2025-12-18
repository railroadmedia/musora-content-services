import { SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { globalConfig } from '../../services/config.js'
import { UserPermissions } from '../../services/permissions/PermissionsAdapter'
import { getPermissionsAdapter } from '../../services/permissions/PermissionsAdapterFactory.js'

const enum FieldName {
  NeedAccess = 'need_access',
  PageType = 'page_type',
}

export interface PageTypeDecorated {
  [FieldName.PageType]?: string
}

export interface NeedAccessDecorated {
  [FieldName.NeedAccess]?: boolean
}

export function contentDecorator<T>(
  result: T,
  fieldName: FieldName,
  callback: Function
): T & { [key in FieldName]?: any } {
  if (result['content']) {
    if (Array.isArray(result['content'])) {
      // Content rows structure: array of rows, each with a content array
      result['content'].forEach((contentItem: any) => {
        if (contentItem) {
          contentItem[fieldName] = callback(contentItem)
        }
      })
    } else {
      result[fieldName] = callback(result)
    }
  } else if (result['lessons']) {
    result['lessons'].forEach((lesson: any) => {
      lesson[fieldName] = callback(lesson) // Updated to check lesson access
    })
  }

  result[fieldName] = callback(result)

  return result as T & { [key in FieldName]?: any }
}

export function pageTypeDecorator<K, T extends { data: K[] | K }>(t: T) {
  const decorator = function (content: any): string {
    return SONG_TYPES_WITH_CHILDREN.includes(content['type']) ? 'song' : 'lesson'
  }

  if (t && Array.isArray(t)) {
    t.data = t.map((i) => contentDecorator(i, FieldName.PageType, decorator))
    return t
  }

  t.data = contentDecorator(t.data, FieldName.PageType, decorator)
  return t
}

export async function needsAccessDecorator<K, T extends { data: K[] | K }>(t: T) {
  if (globalConfig.sanityConfig.useDummyRailContentMethods) {
    return t as T
  }

  const adapter = getPermissionsAdapter()
  const userPermissions: UserPermissions = await adapter.fetchUserPermissions()

  const decorator = function (content: any) {
    return adapter.doesUserNeedAccess(content, userPermissions)
  }

  if (t && Array.isArray(t['data'])) {
    t.data = t.data.map((i) => contentDecorator(i, FieldName.NeedAccess, decorator))
    return t
  }

  t.data = contentDecorator(t.data, FieldName.NeedAccess, decorator)
  return t
}
