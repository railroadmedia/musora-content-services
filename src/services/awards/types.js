/**
 * Type definitions for awards system
 * Using JSDoc for type hints
 */

/**
 * @typedef {Object} AwardDefinition
 * @property {string} _id - Sanity document ID
 * @property {string} name - Award name
 * @property {string} logo - Logo image URL
 * @property {string} badge - Badge image URL
 * @property {string} award - Certificate image URL
 * @property {string} brand - Brand (drumeo, pianote, etc)
 * @property {boolean} [is_active] - Is award active
 * @property {number} [content_id] - Associated railcontent ID
 * @property {string} [content_type] - Content type from Sanity
 * @property {string} [content_title] - Content title from Sanity
 * @property {number[]} [child_ids] - Child lesson railcontent IDs (excludes drafts)
 * @property {boolean} [has_kickoff] - Dynamically set: true for 'guided-course', false otherwise
 * @property {string} [instructor_name] - Instructor name
 * @property {string} [instructor_signature] - Instructor signature image URL
 * @property {string} [award_custom_text] - Custom certificate text
 * @property {string} [type] - Award type (content-award)
 */

/**
 * @typedef {Object} CompletionData
 * @property {string} content_title - Content title
 * @property {string} completed_at - ISO timestamp
 * @property {number} days_user_practiced - Days from first lesson to completion
 * @property {number} practice_minutes - Total practice time in minutes
 */

/**
 * @typedef {Object} CertificateData
 * @property {number} userId - User ID
 * @property {string} userName - User name
 * @property {string} completedAt - Completion timestamp
 * @property {string} awardId - Award ID
 * @property {string} awardType - Award type
 * @property {string} awardTitle - Award title
 * @property {string} popupMessage - Client-generated popup message
 * @property {string} certificateMessage - Client-generated certificate message
 * @property {string} ribbonImage - Ribbon image URL
 * @property {string} awardImage - Certificate image URL
 * @property {string} badgeImage - Badge image URL
 * @property {string} brandLogo - Brand logo URL
 * @property {string} musoraLogo - Musora logo URL
 * @property {string} musoraBgLogo - Background logo URL
 * @property {string} [instructorSignature] - Instructor signature URL
 * @property {string} [instructorName] - Instructor name
 */

// Export empty object for ES6 module compatibility
export default {}
