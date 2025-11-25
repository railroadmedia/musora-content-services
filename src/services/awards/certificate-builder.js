import { AWARD_ASSETS } from '../../constants/award-assets'
import { AwardMessageGenerator } from './message-generator'
import { globalConfig } from '../config'
import { awardManager } from './award-manager'

/** @returns {Promise<import('./types').CertificateData>} */
export async function buildCertificateData(awardId) {
  const { awardDefinitions } = await import('./award-definitions')
  const { getUserData } = await import('../user/management')
  const db = await import('../sync/repository-proxy')

  const awardDef = await awardDefinitions.getById(awardId)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${awardId}`)
  }

  const userProgress = await db.default.userAwardProgress.getByAwardId(awardId)

  if (!userProgress.data || !userProgress.data.completion_data) {
    throw new Error('Completion data not found in local database')
  }

  const completionData = userProgress.data.completion_data
  const awardType = awardManager.determineAwardType(awardDef)

  const popupMessage = AwardMessageGenerator.generatePopupMessage(
    awardType,
    completionData
  )

  const certificateMessage = AwardMessageGenerator.generateCertificateMessage(
    completionData,
    awardDef.award_custom_text
  )

  const userData = await getUserData()

  return {
    userId: globalConfig.sessionConfig.userId,
    userName: userData?.display_name || userData?.name || 'User',
    completedAt: userProgress.data.completed_at
      ? new Date(userProgress.data.completed_at * 1000).toISOString()
      : new Date().toISOString(),

    awardId: awardDef._id,
    awardType: awardDef.type || 'content-award',
    awardTitle: awardDef.name,

    popupMessage,
    certificateMessage,

    ribbonImage: AWARD_ASSETS.ribbon,
    awardImage: awardDef.award,
    badgeImage: awardDef.badge,
    brandLogo: getBrandLogo(awardDef.brand),
    musoraLogo: AWARD_ASSETS.musoraLogo,
    musoraBgLogo: AWARD_ASSETS.musoraBgLogo,
    instructorSignature: awardDef.instructor_signature,
    instructorName: awardDef.instructor_name
  }
}

function getBrandLogo(brand) {
  const normalizedBrand = brand.toLowerCase()
  return AWARD_ASSETS.brandLogos[normalizedBrand] || AWARD_ASSETS.musoraLogo
}
