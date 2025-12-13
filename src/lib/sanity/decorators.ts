import { SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { globalConfig } from '../../services/config.js'
import { PermissionsAdapter, UserPermissions } from '../../services/permissions/PermissionsAdapter'

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

/**
 * Decorates content with nested traversal of content[] and lessons[] arrays.
 * Creates new objects (immutable).
 *
 * @param result - The content to decorate
 * @param fieldName - The field name to add
 * @param callback - Function that returns the field value
 * @returns Decorated content with new field
 */
export function contentDecorator<T>(
  result: T,
  fieldName: FieldName,
  callback: Function
): T & { [key in FieldName]?: any } {
  // Create copy instead of mutating
  const decorated = { ...result }

  // Use .map() instead of .forEach() for content array
  if (decorated['content']) {
    if (Array.isArray(decorated['content'])) {
      // Content rows structure: array of rows, each with a content array
      decorated['content'] = decorated['content'].map((contentItem: any) => {
        if (contentItem) {
          return { ...contentItem, [fieldName]: callback(contentItem) }
        }
        return contentItem
      })
    }
  }

  // Use .map() instead of .forEach() for lessons array
  if (decorated['lessons']) {
    decorated['lessons'] = decorated['lessons'].map((lesson: any) => ({
      ...lesson,
      [fieldName]: callback(lesson),
    }))
  }

  decorated[fieldName] = callback(result)
  return decorated as T & { [key in FieldName]?: any }
}

/**
 * Decorator that adds page_type field ('song' or 'lesson').
 * Handles nested structures automatically via contentDecorator.
 *
 * @example
 * response.map(pageTypeDecorator)
 *
 * @param content - Content to decorate
 * @returns Content with page_type field
 */
export function pageTypeDecorator<T>(content: T): T & PageTypeDecorated {
  const callback = (item: any): string =>
    SONG_TYPES_WITH_CHILDREN.includes(item['type']) ? 'song' : 'lesson'

  return contentDecorator(content, FieldName.PageType, callback) as T & PageTypeDecorated
}

/**
 * Creates a decorator that adds need_access field based on user permissions.
 * Curried for composition with functors.
 * Handles nested structures automatically via contentDecorator.
 *
 * @example
 * const decorator = needsAccessDecorator(perms, adapter)
 * response.map(decorator)
 *
 * @param userPermissions - User's permission data
 * @param adapter - Permissions adapter instance
 * @returns Decorator function for content
 */
export const needsAccessDecorator =
  (userPermissions: UserPermissions, adapter: PermissionsAdapter) =>
  <T>(content: T): T & NeedAccessDecorated => {
    if (globalConfig.sanityConfig.useDummyRailContentMethods) {
      return content as T & NeedAccessDecorated
    }

    const callback = (item: any) => adapter.doesUserNeedAccess(item, userPermissions)
    return contentDecorator(content, FieldName.NeedAccess, callback)
  }
