import { AWARD_ASSETS } from '../../constants/award-assets'
import { AwardMessageGenerator } from './message-generator'

/**
 * Build complete certificate data from backend + Sanity + WatermelonDB
 *
 * Note: This function requires:
 * - awardDefinitions cache to be initialized
 * - db.userAwardProgress repository to be available
 * - Backend /gamification/v1/users/certificate/{id} endpoint
 *
 * @param {number} userAwardProgressId - User award progress ID from backend
 * @returns {Promise<import('./types').CertificateData>} Complete certificate data
 */
export async function buildCertificateData(userAwardProgressId) {
  // Import dynamically to avoid circular dependencies
  const { awardDefinitions } = await import('./award-definitions')
  const db = await import('../sync/repository-proxy')

  // 1. Fetch minimal user/award reference from backend
  const response = await fetch(
    `/gamification/v1/users/certificate/${userAwardProgressId}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch certificate data: ${response.status}`)
  }

  const userData = await response.json()
  // Expected shape: { id, user_id, user_name, award_id, completed_at }

  // 2. Get award definition from Sanity cache
  const awardDef = await awardDefinitions.getById(userData.award_id)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${userData.award_id}`)
  }

  // 3. Get completion data from WatermelonDB
  const userProgress = await db.default.userAwardProgress.getByAwardId(userData.award_id)

  if (!userProgress.data || !userProgress.data.completion_data) {
    throw new Error('Completion data not found in local database')
  }

  const completionData = userProgress.data.completion_data

  // 4. Determine award type
  const awardType = determineAwardType(awardDef)

  // 5. Generate messages client-side
  const popupMessage = AwardMessageGenerator.generatePopupMessage(
    awardType,
    completionData
  )

  const certificateMessage = AwardMessageGenerator.generateCertificateMessage(
    completionData,
    awardDef.award_custom_text
  )

  // 6. Assemble complete certificate data
  return {
    // User data (from backend)
    userId: userData.user_id,
    userName: userData.user_name,
    completedAt: userData.completed_at,

    // Award data (from Sanity)
    awardId: awardDef._id,
    awardType: awardDef.type || 'content-award',
    awardTitle: awardDef.name,

    // Messages (client-generated)
    popupMessage,
    certificateMessage,

    // Images (Sanity + constants)
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

/**
 * Get brand logo from constants
 * @param {string} brand - Brand name
 * @returns {string} Brand logo URL
 */
function getBrandLogo(brand) {
  const normalizedBrand = brand.toLowerCase()

  return AWARD_ASSETS.brandLogos[normalizedBrand] || AWARD_ASSETS.musoraLogo
}

/**
 * Determine award type from definition
 *
 * Options:
 * 1. Read from Sanity field (if you add award_type to schema)
 * 2. Infer from content type
 * 3. Default based on name patterns
 *
 * @param {import('./types').AwardDefinition} awardDef - Award definition
 * @returns {'guided-course' | 'learning-path'} Award type
 */
function determineAwardType(awardDef) {
  // Option 1: If Sanity has award_type field
  // if (awardDef.award_type) {
  //   return awardDef.award_type
  // }

  // Option 2: Infer from name
  if (awardDef.name.toLowerCase().includes('learning path')) {
    return 'learning-path'
  }

  // Option 3: Default to guided-course (safest)
  return 'guided-course'
}
