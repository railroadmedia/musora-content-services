/**
 * 
 */


export class AwardMessageGenerator {
  /** @returns {string} */
  static generatePopupMessage(awardType, completionData) {
    const { days_user_practiced, practice_minutes } = completionData

    if (awardType === 'guided-course') {
      const typeName = 'guided course'
      return `Great job on finishing this ${typeName}! You've worked hard. In the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Nice!`
    }

    return `Congratulations on completing this learning path! You've worked hard. Over the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Amazing work!`
  }

  /** @returns {string} */
  static generateCertificateMessage(completionData, awardCustomText) {
    const { content_title, practice_minutes } = completionData
    const customText = awardCustomText ? ` ${awardCustomText}` : ''

    return `You practiced for a total of ${practice_minutes} minutes during ${content_title}, earning your official certificate of completion.${customText} Well Done!`
  }
}
