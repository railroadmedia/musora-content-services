/**
 * 
 */


export class AwardMessageGenerator {
  /** @returns {string} */
  static generatePopupMessage(awardType, completionData) {
    const { days_user_practiced, practice_minutes, content_title } = completionData

    return `You received this award for completing ${content_title}! You practiced a total of ${practice_minutes} minutes over the past ${days_user_practiced} days.`
  }

  /** @returns {string} */
  static generateCertificateMessage(completionData, awardCustomText) {
    const { content_title, practice_minutes } = completionData
    const customText = awardCustomText ? ` ${awardCustomText}` : ''

    return `You practiced for a total of ${practice_minutes} minutes during ${content_title}, earning your official certificate of completion.${customText} Well Done!`
  }
}
