export interface AwardCompletionData {
  completed_at: string
  days_user_practiced: number
  practice_minutes: number
  content_title: string
  message: string
}

export interface AwardInfo {
  awardId: string
  awardTitle: string
  badge: string
  award: string
  brand: string
  instructorName: string
  progressPercentage: number
  isCompleted: boolean
  completedAt: string | null
  completionData: AwardCompletionData | null
}

export interface ContentAwardsResponse {
  hasAwards: boolean
  awards: AwardInfo[]
}

export interface AwardStatistics {
  totalAvailable: number
  completed: number
  inProgress: number
  notStarted: number
  completionPercentage: number
}

export interface AwardPaginationOptions {
  limit?: number
  offset?: number
}

export interface AwardCallbackPayload {
  awardId: string
  name: string
  badge: string
  completed_at: string
  completion_data: AwardCompletionData
}

export interface ProgressCallbackPayload {
  awardId: string
  progressPercentage: number
}

export type AwardCallbackFunction = (award: AwardCallbackPayload) => void
export type ProgressCallbackFunction = (progress: ProgressCallbackPayload) => void
export type UnregisterFunction = () => void
