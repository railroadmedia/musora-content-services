/**
 * @module Reporting
 * @description Service for submitting user reports about content, comments, forum posts, and playlists.
 *
 * This service provides a unified method to report any type of content when users encounter
 * inappropriate behavior, technical issues, or other problems.
 *
 */

import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { Brand } from '../../lib/brands'
import { globalConfig } from '../config.js'
import { IssueTypeMap, ReportIssueOption, ReportResponse, ReportableType } from './types'

/**
 * Parameters for submitting a report with type-safe issue values
 */
export type ReportParams<T extends ReportableType = ReportableType> = {
  /** Type of content being reported */
  type: T
  /** ID of the content being reported */
  id: number
  /** Issue category - type-safe based on reportable type */
  issue: IssueTypeMap[T]
  /** Details about the issue - required when issue is 'other', not sent otherwise */
  details?: string
  /** Brand context (required: drumeo, pianote, guitareo, singeo, playbass) */
  brand: Brand
}

/**
 * Submit a report for any type of content.
 *
 * This is a unified method that handles all report types (content, comment, forum_post, playlist).
 * The issue parameter is type-safe based on the reportable type.
 *
 * @param {ReportParams} params - The report parameters
 * @returns {Promise<ReportResponse>} The report submission response
 * @throws {HttpError} Throws HttpError if the request fails
 *
 * @example
 * // Report content with technical issue - no details needed
 * const response = await report({
 *   type: 'content',
 *   id: 123,
 *   issue: 'video_issue',
 *   brand: 'drumeo'
 * })
 *
 * console.log(`Report submitted with ID: ${response.report_id}`)
 *
 * @example
 * // Report with 'other' issue - details required
 * await report({
 *   type: 'content',
 *   id: 456,
 *   issue: 'other',
 *   details: 'The instructor audio is out of sync with the video',
 *   brand: 'drumeo'
 * })
 *
 * @example
 * // Report forum post
 * await report({
 *   type: 'forum_post',
 *   id: 789,
 *   issue: 'abusive',
 *   brand: 'drumeo'
 * })
 */
export async function report<T extends ReportableType>(
  params: ReportParams<T>
): Promise<Either<HttpError, ReportResponse>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)

  // Build request body
  const requestBody: any = {
    reportable_type: params.type,
    reportable_id: params.id,
    issue: params.issue,
    brand: params.brand,
  }

  // Add details only when provided (required for 'other' issue)
  if (params.details) {
    requestBody.details = params.details
  }

  const response = await httpClient.post<ReportResponse>(
    '/api/user-reports/v1/reports',
    requestBody
  )

  return response
}

/**
 * Get valid report issue options for a specific reportable type
 *
 * @param {ReportableType} type - The type of content being reported
 * @param {boolean} isMobileApp - Whether this is for mobile app (includes download option)
 * @returns {ReportIssueOption[]} Array of valid issue options with their labels
 *
 * @example
 * // Web options (default)
 * const contentOptions = getReportIssueOptions('content')
 * // Returns: [
 * //   { value: 'incorrect_metadata', label: 'The lesson image, title or description is incorrect' },
 * //   { value: 'video_issue', label: 'Video issue' },
 * //   { value: 'assignment_issue', label: 'An issue with lesson assignment' },
 * //   { value: 'other', label: 'Other' }
 * // ]
 *
 * @example
 * // Mobile app options (includes download)
 * const contentOptions = getReportIssueOptions('content', true)
 * // Returns: [
 * //   { value: 'incorrect_metadata', label: 'The lesson image, title or description is incorrect' },
 * //   { value: 'video_issue', label: 'Video issue' },
 * //   { value: 'download_unavailable', label: 'Download is not available' },
 * //   { value: 'assignment_issue', label: 'An issue with lesson assignment' },
 * //   { value: 'other', label: 'Other' }
 * // ]
 */
export function getReportIssueOptions(
  type: ReportableType,
  isMobileApp: boolean = false
): ReportIssueOption[] {
  switch (type) {
    case 'forum_post':
      return [
        { value: 'offensive_language', label: 'It contains offensive language or content' },
        { value: 'abusive', label: "It's abusive or harmful" },
        { value: 'personal_information', label: 'It contains personal information' },
        { value: 'misleading', label: "It's misleading or a false claim" },
        { value: 'other', label: 'Other reasons' },
      ]

    case 'comment':
      return [
        { value: 'offensive_language', label: 'It contains offensive language or content' },
        { value: 'abusive', label: "It's abusive or harmful" },
        { value: 'personal_information', label: 'It contains personal information' },
        { value: 'misleading', label: "It's misleading or a false claim" },
        { value: 'other', label: 'Other reasons' },
      ]

    case 'content':
      const contentOptions = [
        {
          value: 'incorrect_metadata',
          label: 'The lesson image, title or description is incorrect',
        },
        { value: 'video_issue', label: 'Video issue' },
      ]

      // Add download option only for mobile app
      if (isMobileApp) {
        contentOptions.push({ value: 'download_unavailable', label: 'Download is not available' })
      }

      contentOptions.push(
        { value: 'assignment_issue', label: 'An issue with lesson assignment' },
        { value: 'other', label: 'Other' }
      )

      return contentOptions

    case 'playlist':
      const playlistOptions = [
        {
          value: 'incorrect_metadata',
          label: 'The lesson image, title or description is incorrect',
        },
        { value: 'video_issue', label: 'Video issue' },
      ]

      // Add download option only for mobile app
      if (isMobileApp) {
        playlistOptions.push({ value: 'download_unavailable', label: 'Download is not available' })
      }

      playlistOptions.push(
        { value: 'assignment_issue', label: 'An issue with lesson assignment' },
        { value: 'other', label: 'Other' }
      )

      return playlistOptions

    default:
      return [{ value: 'other', label: 'Other' }]
  }
}
