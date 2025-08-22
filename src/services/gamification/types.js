/**
 * @typedef {Object} Award
 * @property {number} id - Unique identifier for the user award progress.
 * @property {number} user_id - Unique identifier for the user.
 * @property {number} award_id - Unique sanity _id value for the award.
 * @property {string} title - The title of the award.
 * @property {string} type - The type of the award (eg: content-award).
 * @property {string} badge - URL of the award badge image.
 * @property {Date} completed_at - Date when the award was completed.
 * @property {Object} completion_data - data with the award completion. Will always include the "message" property
 * @property {Object} completion_data.message - Display message
*/

/**
 * @typedef {Object} Certificate
 * @property {number} id - Unique identifier for the user award progress .
 * @property {number} user_id - Unique identifier for the user.
 * @property {string} user_name - Display name of the user.
 * @property {Date} completed_at - Date when the award was completed.
 * @property {string} title - The title of the award.
 * @property {string} message - Certificate message.
 * @property {string} ribbon_image - Url of the ribbon image.
 * @property {string} ribbon_image_64 - Base 64 value of the ribbon image.
 * @property {string} musora_logo - Url of the musora logo.
 * @property {string} musora_logo_64 - Base 64 value of the musora logo.
 * @property {string} brand_logo - Url of the brand logo.
 * @property {string} brand_logo_64 - Base 64 value of the brand logo.
 * @property {string} award_image - Url of the award image.
 * @property {string} award_image_64 - Base 64 value of the award image.
 * @property {string} instructor_signature - Url of the award image.
 * @property {string} award_image_64 - Base 64 value of the award image.
 */
