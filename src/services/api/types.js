/**
 * @typedef {Object} PaginatedMeta
 * @property {number} current_page - Total number of items
 * @property {number} from - First index of returned data
 * @property {number} to - Last index of returned data
 * @property {number} per_page - Total number of items per page
 * @property {number} last_page - Last page accessed
 * @property {number} total - Total number of items
 * @property {string} path - Url of the current page
 */

/**
 * @typedef {Object} PaginatedLinks
 * @property {string} first - URL of the first page
 * @property {string} last - URL of the last page
 * @property {string} next - URL of the next page
 * @property {string} prev - URL of the previous page
 */

/**
 * @typedef {Object<T>} PaginatedResponse
 * @property {PaginatedMeta} meta - Meta information
 * @property {PaginatedLinks} links - Links information
 * @property {Array<T>} data - Data
 */
