/**
 * @typedef {Object} AwardCompletionData
 * @property {string} completed_at - ISO timestamp of completion
 * @property {number} days_user_practiced - Number of days the user practiced
 * @property {number} practice_minutes - Total practice time in minutes
 * @property {string} content_title - Title of the completed content
 * @property {string} message - Congratulations message for display
 */

/**
 * @typedef {Object} AwardInfo
 * @property {string} awardId - Unique Sanity award ID
 * @property {string} awardTitle - Display name of the award
 * @property {string} badge - URL to badge image
 * @property {string} award - URL to award image
 * @property {string} brand - Brand (drumeo, pianote, guitareo, singeo)
 * @property {string} instructorName - Name of the instructor
 * @property {number} progressPercentage - Completion percentage (0-100)
 * @property {boolean} isCompleted - Whether the award is fully completed
 * @property {string|null} completedAt - ISO timestamp of completion, or null if not completed
 * @property {AwardCompletionData|null} completionData - Practice statistics, or null if not started
 */

/**
 * @typedef {Object} ContentAwardsResponse
 * @property {boolean} hasAwards - Whether the content has any associated awards
 * @property {AwardInfo[]} awards - Array of award objects with progress information
 */

/**
 * @typedef {Object} AwardStatistics
 * @property {number} totalAvailable - Total number of awards available
 * @property {number} completed - Number of completed awards
 * @property {number} inProgress - Number of awards in progress
 * @property {number} notStarted - Number of awards not yet started
 * @property {number} completionPercentage - Overall completion percentage (0-100)
 */

/**
 * @typedef {Object} AwardPaginationOptions
 * @property {number} [limit] - Maximum number of results to return
 * @property {number} [offset] - Number of results to skip for pagination
 */

/**
 * @typedef {Object} AwardCallbackPayload
 * @property {string} awardId - Unique Sanity award ID
 * @property {string} name - Display name of the award
 * @property {string} badge - URL to badge image
 * @property {string} completed_at - ISO timestamp of completion
 * @property {AwardCompletionData} completion_data - Practice statistics
 */

/**
 * @typedef {Object} ProgressCallbackPayload
 * @property {string} awardId - Unique Sanity award ID
 * @property {number} progressPercentage - Completion percentage (0-100)
 */

/**
 * @callback AwardCallbackFunction
 * @param {AwardCallbackPayload} award - Award data when an award is earned
 * @returns {void}
 */

/**
 * @callback ProgressCallbackFunction
 * @param {ProgressCallbackPayload} progress - Progress data when award progress changes
 * @returns {void}
 */

/**
 * @callback UnregisterFunction
 * @returns {void}
 */
