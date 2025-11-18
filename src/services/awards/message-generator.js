/**
 * Client-side message generation for award popups and certificates
 * Migrated from backend GuidedCourseAward and LearningPathAward classes
 */
export class AwardMessageGenerator {

  /**
   * Generate popup message shown when award is granted
   *
   * Migrated from:
   * - GuidedCourseAward::getCompletionMessage()
   * - LearningPathAward::getCompletionMessage()
   *
   * @param {'guided-course' | 'learning-path'} awardType - Type of award
   * @param {Object} completionData - Completion data
   * @param {number} completionData.days_user_practiced - Days practiced
   * @param {number} completionData.practice_minutes - Practice minutes
   * @returns {string} Popup message
   */
  static generatePopupMessage(awardType, completionData) {
    const { days_user_practiced, practice_minutes } = completionData

    if (awardType === 'guided-course') {
      const typeName = 'guided course'
      return `Great job on finishing this ${typeName}! You've worked hard. In the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Nice!`
    }

    // Learning path
    return `Congratulations on completing this learning path! You've worked hard. Over the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Amazing work!`
  }

  /**
   * Generate certificate message shown on certificate
   *
   * Migrated from:
   * - GuidedCourseAward::getCertificateMessage()
   * - LearningPathAward::getCertificateMessage()
   *
   * @param {Object} completionData - Completion data
   * @param {string} completionData.content_title - Content title
   * @param {number} completionData.practice_minutes - Practice minutes
   * @param {string} [awardCustomText] - Optional custom text
   * @returns {string} Certificate message
   */
  static generateCertificateMessage(completionData, awardCustomText) {
    const { content_title, practice_minutes } = completionData
    const customText = awardCustomText ? ` ${awardCustomText}` : ''

    return `You practiced for a total of ${practice_minutes} minutes during ${content_title}, earning your official certificate of completion.${customText} Well Done!`
  }
}
