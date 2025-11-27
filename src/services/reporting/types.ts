/**
 * @module Reporting Types
 */

/**
 * Type of entity being reported
 */
export type ReportableType = 'content' | 'comment' | 'forum_post' | 'playlist'

/**
 * Valid issue types for forum posts
 */
export type ForumIssueType = 'spam' | 'harassment' | 'inappropriate' | 'other'

/**
 * Valid issue types for comments
 */
export type CommentIssueType = 'offensive_language' | 'abusive' | 'personal_information' | 'misleading' | 'other'

/**
 * Valid issue types for content
 */
export type ContentIssueType = 'incorrect_metadata' | 'video_issue' | 'download_unavailable' | 'assignment_issue' | 'other'

/**
 * Valid issue types for playlists
 */
export type PlaylistIssueType = 'incorrect_metadata' | 'video_issue' | 'download_unavailable' | 'assignment_issue' | 'other'

/**
 * Map reportable type to its valid issue types
 */
export type IssueTypeMap = {
  forum_post: ForumIssueType
  comment: CommentIssueType
  content: ContentIssueType
  playlist: PlaylistIssueType
}

/**
 * Response from submitting a report
 */
export interface ReportResponse {
  /** The ID of the submitted report */
  report_id: number
  /** Success message */
  message: string
}

/**
 * Report issue option
 */
export interface ReportIssueOption {
  value: string
  label: string
}
