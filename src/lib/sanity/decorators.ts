import { SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse.js'
import { globalConfig } from '../../services/config.js'
import { PermissionsAdapter, UserPermissions } from '../../services/permissions/PermissionsAdapter'

const enum FieldName {
  NeedAccess = 'need_access',
  PageType = 'page_type',
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

export function contentListDecorator<T>(
  results: SanityListResponse<T>,
  fieldName: FieldName,
  callback: Function
): SanityListResponse<T & { [key in FieldName]?: any }> {
  results.data.forEach((result) => {
    result = contentDecorator(result, fieldName, callback)
  })
  return results as SanityListResponse<T & { [key in FieldName]?: any }>
}

export function pageTypeDecorator<T>(results: T): T & { [FieldName.PageType]?: string }
export function pageTypeDecorator<T>(
  results: SanityListResponse<T> | T
):
  | SanityListResponse<T & { [FieldName.PageType]?: string }>
  | (T & { [FieldName.PageType]?: string }) {
  const decorator = function (content: any): string {
    return SONG_TYPES_WITH_CHILDREN.includes(content['type']) ? 'song' : 'lesson'
  }

  if (results && (results as SanityListResponse<T>).data) {
    return contentListDecorator(results as SanityListResponse<T>, FieldName.PageType, decorator)
  }

  return contentDecorator(results, FieldName.PageType, decorator) as T & {
    [FieldName.PageType]?: string
  }
}

export function needsAccessDecorator<T>(
  results: SanityListResponse<T> | T,
  userPermissions: UserPermissions,
  adapter: PermissionsAdapter
): T & { [FieldName.NeedAccess]?: boolean }
export function needsAccessDecorator<T>(
  results: SanityListResponse<T> | T,
  userPermissions: UserPermissions,
  adapter: PermissionsAdapter
):
  | SanityListResponse<T & { [FieldName.NeedAccess]?: boolean }>
  | (T & { [FieldName.NeedAccess]?: boolean }) {
  if (globalConfig.sanityConfig.useDummyRailContentMethods) {
    return results as T & { [FieldName.NeedAccess]?: boolean }
  }

  const decorator = function (content: any) {
    return adapter.doesUserNeedAccess(content, userPermissions)
  }

  if (results && (results as SanityListResponse<T>).data) {
    return contentListDecorator(results as SanityListResponse<T>, FieldName.NeedAccess, decorator)
  }

  return contentDecorator(results as T, FieldName.NeedAccess, decorator)
}
