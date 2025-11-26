/**
 * @module Awards
 */

import { HttpClient } from '../../infrastructure/http/HttpClient'
import { PaginatedResponse } from '../api/types'
import { globalConfig } from '../config'

const baseUrl = `/api/gamification`

export interface Certificate {
  award_id: string
  user_name: string
  user_id: number
  completed_at: string
  message: string
  type: string
  title: string
  musora_logo: string
  musora_logo_64: string
  musora_bg_logo: string
  musora_bg_logo_64: string
  brand_logo: string
  brand_logo_64: string
  ribbon_image: string
  ribbon_image_64: string
  award_image: string
  award_image_64: string
  instructor_name: string
  instructor_signature?: string
  instructor_signature_64?: string
}

/**
 * Get certificate data for a completed user award
 *
 * Uses local WatermelonDB data and converts all images to base64 format
 * for certificate generation in the frontend.
 *
 * @param {string} awardId - The Sanity award ID (e.g., "abc-def-123")
 * @returns {Promise<Certificate>} - The certificate data with base64-encoded images
 * @throws {Error} - If the award is not found or not completed
 */
export async function fetchCertificate(awardId: string): Promise<Certificate> {
  const { buildCertificateData } = await import('../awards/certificate-builder')
  const { urlMapToBase64 } = await import('../awards/image-utils')

  const certData = await buildCertificateData(awardId)

  const imageMap = {
    ribbon_image_64: certData.ribbonImage,
    award_image_64: certData.awardImage,
    musora_bg_logo_64: certData.musoraBgLogo,
    brand_logo_64: certData.brandLogo,
    musora_logo_64: certData.musoraLogo,
    ...(certData.instructorSignature && { instructor_signature_64: certData.instructorSignature })
  }

  const base64Images = await urlMapToBase64(imageMap)

  return {
    award_id: awardId,
    user_name: certData.userName,
    user_id: certData.userId,
    completed_at: certData.completedAt,
    message: certData.certificateMessage,
    type: certData.awardType,
    title: certData.awardTitle,
    musora_logo: certData.musoraLogo,
    musora_logo_64: base64Images.musora_logo_64,
    musora_bg_logo: certData.musoraBgLogo,
    musora_bg_logo_64: base64Images.musora_bg_logo_64,
    brand_logo: certData.brandLogo,
    brand_logo_64: base64Images.brand_logo_64,
    ribbon_image: certData.ribbonImage,
    ribbon_image_64: base64Images.ribbon_image_64,
    award_image: certData.awardImage,
    award_image_64: base64Images.award_image_64,
    instructor_name: certData.instructorName,
    instructor_signature: certData.instructorSignature,
    instructor_signature_64: base64Images.instructor_signature_64
  }
}
