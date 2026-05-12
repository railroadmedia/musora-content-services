export class AwardMessageGenerator {
  /** @returns {string} */
  static generatePopupMessage(completionData) {
    const { days_user_practiced, practice_minutes, content_title } = completionData
    const minutesLabel = practice_minutes === 1 ? 'minute' : 'minutes'
    const daysLabel = days_user_practiced === 1 ? 'day' : 'days'

    return `You received this award for completing ${content_title}! You practiced a total of ${practice_minutes} ${minutesLabel} over the past ${days_user_practiced} ${daysLabel}.`
  }

  /** @returns {string} */
  static generateCertificateMessage(completionData, awardCustomText) {
    const { content_title, practice_minutes } = completionData
    const minutesLabel = practice_minutes === 1 ? 'minute' : 'minutes'
    const customText = awardCustomText ? ` ${awardCustomText}` : ''

    return `You practiced for a total of ${practice_minutes} ${minutesLabel} during ${content_title}, earning your official certificate of completion.${customText} Well Done!`
  }
}
