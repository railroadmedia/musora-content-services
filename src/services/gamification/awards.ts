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
 * Fetch certificate data for a completed award with all images converted to base64.
 * Returns certificate information ready for rendering in a PDF or image format.
 * All image URLs (logos, signatures, ribbons) are converted to base64 strings for offline use.
 *
 * @param {string} awardId - Unique Sanity award ID
 *
 * @returns {Promise<Certificate>} Certificate object with base64-encoded images:
 *   - award_id {string} - Sanity award ID
 *   - user_name {string} - User's display name
 *   - user_id {number} - User's ID
 *   - completed_at {string} - ISO timestamp of completion
 *   - message {string} - Certificate message for display
 *   - type {string} - Award type (e.g., 'content-award')
 *   - title {string} - Award title/name
 *   - musora_logo {string} - URL to Musora logo
 *   - musora_logo_64 {string} - Base64-encoded Musora logo
 *   - musora_bg_logo {string} - URL to Musora background logo
 *   - musora_bg_logo_64 {string} - Base64-encoded background logo
 *   - brand_logo {string} - URL to brand logo
 *   - brand_logo_64 {string} - Base64-encoded brand logo
 *   - ribbon_image {string} - URL to ribbon decoration
 *   - ribbon_image_64 {string} - Base64-encoded ribbon image
 *   - award_image {string} - URL to award image
 *   - award_image_64 {string} - Base64-encoded award image
 *   - instructor_name {string} - Instructor's name
 *   - instructor_signature {string|undefined} - URL to signature (if available)
 *   - instructor_signature_64 {string|undefined} - Base64-encoded signature
 *
 * @throws {Error} If award is not found or not completed
 *
 * @example Generate certificate PDF
 * const cert = await fetchCertificate('abc-123')
 * generatePDF({
 *   userName: cert.user_name,
 *   awardTitle: cert.title,
 *   completedAt: new Date(cert.completed_at).toLocaleDateString(),
 *   message: cert.message,
 *   brandLogo: `data:image/png;base64,${cert.brand_logo_64}`,
 *   signature: cert.instructor_signature_64
 *     ? `data:image/png;base64,${cert.instructor_signature_64}`
 *     : null
 * })
 *
 * @example Display certificate preview
 * const cert = await fetchCertificate(awardId)
 * return (
 *   <CertificatePreview
 *     userName={cert.user_name}
 *     awardTitle={cert.title}
 *     message={cert.message}
 *     awardImage={`data:image/png;base64,${cert.award_image_64}`}
 *     instructorName={cert.instructor_name}
 *     signature={cert.instructor_signature_64}
 *   />
 * )
 */
export async function fetchCertificate(awardId: string): Promise<Certificate> {
  const { buildCertificateData } = await import('../awards/internal/certificate-builder')
  const { urlMapToBase64 } = await import('../awards/internal/image-utils')

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
