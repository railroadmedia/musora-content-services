import { SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { globalConfig } from '../../services/config.js'
import { PermissionsAdapter, UserPermissions } from '../../services/permissions/PermissionsAdapter'

const enum FieldNames {
  NeedAccess = 'need_access',
  PageType = 'page_type',
}

export function contentResultsDecorator<T = any>(
  results: T,
  fieldName: FieldNames,
  callback: Function
): T {
  if (Array.isArray(results)) {
    results.forEach((result) => {
      // Check if this is a content row structure
      if (result.content && Array.isArray(result.content)) {
        // Content rows structure: array of rows, each with a content array
        result.content.forEach((contentItem: any) => {
          if (contentItem) {
            contentItem[fieldName] = callback(contentItem)
          }
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results['data'] && Array.isArray(results['data'])) {
    // Group By
    results['data'].forEach((result) => {
      if (result.lessons) {
        result.lessons.forEach((lesson: any) => {
          lesson[fieldName] = callback(lesson) // Updated to check lesson access
        })
      } else {
        result[fieldName] = callback(result)
      }
    })
  } else if (results['related_lessons'] && Array.isArray(results['related_lessons'])) {
    results['related_lessons'].forEach((result) => {
      result[fieldName] = callback(result)
    })
  } else {
    results[fieldName] = callback(results)
  }

  return results
}

export function pageTypeDecorator<T>(results: T): T {
  return contentResultsDecorator(results, FieldNames.PageType, function (content: any) {
    return SONG_TYPES_WITH_CHILDREN.includes(content['type']) ? 'song' : 'lesson'
  })
}

export function needsAccessDecorator<T = any>(
  results: T,
  userPermissions: UserPermissions,
  adapter: PermissionsAdapter
): T {
  if (globalConfig.sanityConfig.useDummyRailContentMethods) return results
  return contentResultsDecorator(results, FieldNames.NeedAccess, function (content: any) {
    return adapter.doesUserNeedAccess(content, userPermissions)
  })
}
