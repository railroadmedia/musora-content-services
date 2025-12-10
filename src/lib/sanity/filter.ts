import { filtersToGroq } from '../../contentTypeConfig'
import { getPermissionsAdapter } from '../../services/permissions/index'
import type { UserPermissions } from '../../services/permissions/PermissionsAdapter'
import { query, queryMonoids, filterOps } from './query'

// ============================================
// TYPES & INTERFACES
// ============================================
//

export type Prefix = '' | '@->' | '^.'

export interface PermissionsConfig {
  bypassPermissions?: boolean
  showMembershipRestrictedContent?: boolean
  showOnlyOwnedContent?: boolean
  userData?: UserPermissions
  prefix?: Prefix
}

export interface StatusConfig {
  statuses?: string[]
  bypassStatuses?: boolean
  isSingle?: boolean
  isAdmin?: boolean
  prefix?: Prefix
}

export interface DateConfig {
  bypassPublishedDate?: boolean
  pullFutureContent?: boolean
  getFutureContentOnly?: boolean
  prefix?: Prefix
}

export interface ContentFilterConfig extends PermissionsConfig, StatusConfig, DateConfig {
  prefix?: Prefix
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_SCHEDULED = 'scheduled'
const STATUS_PUBLISHED = 'published'
const STATUS_DRAFT = 'draft'
const STATUS_ARCHIVED = 'archived'
const STATUS_UNLISTED = 'unlisted'

const CHILD_PREFIX: Prefix = '@->'
const PARENT_PREFIX: Prefix = '^.'

// ============================================
// HELPER UTILITIES
// ============================================

const getRoundedTime = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 1)
}

const applyPrefix = (prefix: Prefix, filter: string): string => {
  if (!prefix || !filter) return filter
  // Replace field names with prefixed versions
  return filter.replace(/\b([a-z_][a-z0-9_]*)\s*(==|!=|<=|>=|<|>|in|match)/gi, `${prefix}$1 $2`)
}

const arrayToStringRepresentation = (arr: string[]): string => {
  return '[' + arr.map((item) => `'${item}'`).join(',') + ']'
}

// ============================================
// MAIN FILTERS CLASS
// ============================================

export class Filters {
  static empty = ''

  // ============================================
  // SIMPLE FILTERS (Synchronous)
  // ============================================

  /**
   * @param {string} brand - The brand to filter by
   * @returns {string} Filter expression
   * @example Filters.brand('drumeo') // "brand == 'drumeo'"
   */
  static brand(brand: string): string {
    return `brand == "${brand}"`
  }

  /**
   * @param {string} type - The content type to filter by
   * @returns {string} Filter expression
   * @example Filters.type('song') // "_type == 'song'"
   */
  static type(type: string): string {
    return `_type == "${type}"`
  }

  /**
   * @param {string} slug - The slug to filter by
   * @returns {string} Filter expression
   * @example Filters.slug('guitar-basics') // "slug.current == 'guitar-basics'"
   */
  static slug(slug: string): string {
    return `slug.current == "${slug}"`
  }

  /**
   * @param {number} id - The railcontent_id to filter by
   * @returns {string} Filter expression
   * @example Filters.railcontentId(12345) // "railcontent_id == 12345"
   */
  static railcontentId(id: number): string {
    return `railcontent_id == ${id}`
  }

  /**
   * @param {string[]} statuses - Array of status values
   * @returns {string} Filter expression
   * @example Filters.statusIn(['published', 'scheduled']) // "status in ['published','scheduled']"
   */
  static statusIn(statuses: string[]): string {
    return `status in ${arrayToStringRepresentation(statuses)}`
  }

  /**
   * @param {number[]} ids - Array of railcontent_id values
   * @returns {string} Filter expression
   * @example Filters.idIn([123, 456, 789]) // "railcontent_id in [123,456,789]"
   */
  static idIn(ids: number[]): string {
    return `railcontent_id in [${ids.join(',')}]`
  }

  /**
   * @param {string} id - The document ID to reference
   * @returns {string} Filter expression
   * @example Filters.references('abc123') // "references('abc123')"
   */
  static references(id: string): string {
    return `references("${id}")`
  }

  static referencesIDWithFilter(filter: string): string {
    return `references(*[${filter}]._id)`
  }

  /**
   * @returns {string} Filter expression
   * @example Filters.referencesParent() // "references(^._id)"
   */
  static referencesParent(): string {
    return `references(^._id)`
  }

  /**
   * @param {string} field - The field to match in the reference query
   * @param {string} value - The value to match
   * @returns {string} Filter expression
   * @example Filters.referencesField('slug.current', 'john-doe')
   */
  static referencesField(field: string, value: string): string {
    return `references(*[${field} == "${value}"]._id)`
  }

  /**
   * @param {string} term - The search term
   * @returns {string} Filter expression
   * @example Filters.titleMatch('guitar') // "title match 'guitar*'"
   */
  static titleMatch(term: string): string {
    return `title match "${term}*"`
  }

  /**
   * @param {string} field - The field to search in
   * @param {string} term - The search term
   * @returns {string} Filter expression
   * @example Filters.searchMatch('description', 'beginner') // "description match 'beginner*'"
   */
  static searchMatch(field: string, term?: string): string {
    return term ? `${field} match "${term}*"` : Filters.empty
  }

  /**
   * @param {string} date - ISO date string
   * @returns {string} Filter expression
   * @example Filters.publishedBefore('2024-01-01') // "published_on <= '2024-01-01'"
   */
  static publishedBefore(date: string): string {
    return `published_on <= "${date}"`
  }

  /**
   * @param {string} date - ISO date string
   * @returns {string} Filter expression
   * @example Filters.publishedAfter('2024-01-01') // "published_on >= '2024-01-01'"
   */
  static publishedAfter(date: string): string {
    return `published_on >= "${date}"`
  }

  /**
   * @param {string} field - The field to check
   * @returns {string} Filter expression
   * @example Filters.defined('thumbnail') // "defined(thumbnail)"
   */
  static defined(field: string): string {
    return `defined(${field})`
  }

  /**
   * @param {string} field - The field to check
   * @returns {string} Filter expression
   * @example Filters.notDefined('thumbnail') // "!defined(thumbnail)"
   */
  static notDefined(field: string): string {
    return `!defined(${field})`
  }

  /**
   * @param {Prefix} [prefix=''] - Optional prefix for the field
   * @returns {string} Filter expression
   * @example Filters.notDeprecated() // "!defined(deprecated_railcontent_id)"
   * @example Filters.notDeprecated('@->') // "!defined(@->deprecated_railcontent_id)"
   */
  static notDeprecated(prefix: Prefix = ''): string {
    return `!defined(${prefix}deprecated_railcontent_id)`
  }

  // ============================================
  // PREFIX MODIFIERS
  // ============================================

  /**
   * @param {Prefix} prefix - The prefix to apply ('', '@->', '^.')
   * @param {string} filter - The filter expression to prefix
   * @returns {string} Filter expression with prefix applied
   * @example Filters.withPrefix('@->', Filters.brand('drumeo'))
   */
  static withPrefix(prefix: Prefix, filter: string): string {
    return applyPrefix(prefix, filter)
  }

  /**
   * @param {string} filter - The filter expression to prefix
   * @returns {string} Filter expression with child prefix (@->)
   * @example Filters.asChild(Filters.statusIn(['published']))
   */
  static asChild(filter: string): string {
    return applyPrefix(CHILD_PREFIX, filter)
  }

  /**
   * @param {string} filter - The filter expression to prefix
   * @returns {string} Filter expression with parent prefix (^.)
   * @example Filters.asParent(Filters.brand('drumeo'))
   */
  static asParent(filter: string): string {
    return applyPrefix(PARENT_PREFIX, filter)
  }

  // ============================================
  // COMPOSITION UTILITIES
  // ============================================

  /**
   * @param {...string} filters - Filter expressions to combine with AND
   * @returns {string} Combined filter expression
   * @example Filters.combine(Filters.brand('drumeo'), Filters.type('song'))
   */
  static combine(...filters: (string | undefined | null | false)[]): string {
    return (filters.filter((f) => f) as string[]).reduce(filterOps.and.concat, filterOps.and.empty)
  }

  /**
   * @param {...string} filters - Filter expressions to combine with OR
   * @returns {string} Combined filter expression
   * @example Filters.combineOr(Filters.type('song'), Filters.type('workout'))
   */
  static combineOr(...filters: (string | undefined | null | false)[]): string {
    return (filters.filter((f) => f) as string[]).reduce(filterOps.or.concat, filterOps.or.empty)
  }

  /**
   * @param {...(string | Promise<string>)} filters - Mix of synchronous filter expressions and promises
   * @returns {Promise<string>} Promise that resolves to combined filter expression
   * @example
   * await Filters.combineAsync(
   *   Filters.brand('drumeo'),
   *   Filters.permissions({ bypassPermissions: false }),
   *   Filters.status({ isSingle: false })
   * )
   */
  static async combineAsync(
    ...filters: (string | Promise<string> | undefined | null | false)[]
  ): Promise<string> {
    const resolved = (await Promise.all(
      filters.map((f) => Promise.resolve(f)).filter((f) => f)
    )) as string[]

    return resolved.reduce(filterOps.or.concat, filterOps.and.empty)
  }

  /**
   * @param {...(string | Promise<string>)} filters - Mix of synchronous filter expressions and promises
   * @returns {Promise<string>} Promise that resolves to combined filter expression
   * @example
   * await Filters.combineOrAsync(
   *   Filters.type('song'),
   *   Filters.type('workout'),
   *   Filters.permissions({ bypassPermissions: false })
   * )
   */
  static async combineAsyncOr(
    ...filters: (string | Promise<string> | undefined | null | false)[]
  ): Promise<string> {
    const resolved = (await Promise.all(
      filters.map((f) => Promise.resolve(f)).filter((f) => f)
    )) as string[]

    return resolved.reduce(filterOps.or.concat, filterOps.or.empty)
  }

  // ============================================
  // ASYNC FILTERS (Permission/Status based)
  // ============================================

  /**
   * @param {PermissionsConfig} config - Permissions configuration
   * @returns {Promise<string>} Filter expression based on user permissions
   * @example await Filters.permissions({ bypassPermissions: false })
   */
  static async permissions(config: PermissionsConfig = {}): Promise<string> {
    if (config.bypassPermissions) return ''

    const adapter = getPermissionsAdapter()
    const userData = config.userData || (await adapter.fetchUserPermissions())

    if (adapter.isAdmin(userData)) return ''

    const permissionsFilter = adapter.generatePermissionsFilter(userData, {
      prefix: config.prefix || '',
      showMembershipRestrictedContent: config.showMembershipRestrictedContent,
      showOnlyOwnedContent: config.showOnlyOwnedContent,
    })

    return permissionsFilter || ''
  }

  /**
   * @param {StatusConfig} config - Status configuration
   * @returns {Promise<string>} Filter expression for status
   * @example await Filters.status({ statuses: ['published', 'scheduled'] })
   */
  static async status(config: StatusConfig = {}): Promise<string> {
    if (config.bypassStatuses) return ''

    let statuses = config.statuses || []

    // Auto-determine statuses if not provided
    if (statuses.length === 0) {
      const userData = await getPermissionsAdapter().fetchUserPermissions()
      const isAdmin = getPermissionsAdapter().isAdmin(userData)

      if (config.isAdmin || isAdmin) {
        statuses = [
          STATUS_DRAFT,
          STATUS_SCHEDULED,
          STATUS_PUBLISHED,
          STATUS_ARCHIVED,
          STATUS_UNLISTED,
        ]
      } else if (config.isSingle) {
        statuses = [STATUS_SCHEDULED, STATUS_PUBLISHED, STATUS_UNLISTED, STATUS_ARCHIVED]
      } else {
        statuses = [STATUS_SCHEDULED, STATUS_PUBLISHED]
      }
    }

    const filter = Filters.statusIn(statuses)
    return config.prefix ? applyPrefix(config.prefix, filter) : filter
  }

  /**
   * @param {DateConfig} config - Date configuration
   * @returns {string} Filter expression for published date
   * @example Filters.publishedDate({ pullFutureContent: false })
   */
  static publishedDate(config: DateConfig = {}): string {
    if (config.bypassPublishedDate) return ''

    const now = getRoundedTime().toISOString()

    let filter = ''
    if (config.getFutureContentOnly) {
      filter = Filters.publishedAfter(now)
    } else if (!config.pullFutureContent) {
      filter = Filters.publishedBefore(now)
    }

    return config.prefix && filter ? applyPrefix(config.prefix, filter) : filter
  }

  // ============================================
  // HIGH-LEVEL COMPOSITE FILTERS
  // ============================================

  /**
   * @param {ContentFilterConfig} config - Complete filter configuration
   * @returns {Promise<string>} Combined filter expression (status + permissions + date + deprecated)
   * @example await Filters.contentFilter({ bypassPermissions: false, pullFutureContent: false })
   */
  static async contentFilter(config: ContentFilterConfig = {}): Promise<string> {
    return Filters.combineAsync(
      Filters.status(config),
      Filters.permissions({ ...config }),
      Filters.publishedDate(config),
      Filters.notDeprecated(config.prefix || '')
    )
  }

  /**
   * @param {ContentFilterConfig} config - Complete filter configuration
   * @returns {Promise<string>} Content filter with child prefix (@->)
   * @example await Filters.childFilter({ showMembershipRestrictedContent: true })
   */
  static async childFilter(config: ContentFilterConfig = {}): Promise<string> {
    return Filters.contentFilter({ ...config, prefix: CHILD_PREFIX })
  }

  /**
   * @param {ContentFilterConfig} config - Complete filter configuration
   * @returns {Promise<string>} Content filter with parent prefix (^.)
   * @example await Filters.parentFilter({ bypassPermissions: true })
   */
  static async parentFilter(config: ContentFilterConfig = {}): Promise<string> {
    return Filters.contentFilter({ ...config, prefix: PARENT_PREFIX })
  }

  // ============================================
  // MISC UTILITIES FIlTERS
  // ============================================
  static includedFields(includedFields: string[]): string {
    return includedFields.length > 0 ? filtersToGroq(includedFields) : Filters.empty
  }

  static count(filter: string): string {
    return `count(*[${filter}])`
  }

  static progressIds(progressIds: number[]): string {
    return progressIds.length > 0 ? Filters.idIn(progressIds) : Filters.empty
  }
}

// Default export
export default Filters
