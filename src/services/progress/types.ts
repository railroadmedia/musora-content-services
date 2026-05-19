export interface ProgressMetadata {
  brand: string
  parent_id: number
  type: string
}

export interface Hierarchy {
  parents: Record<number, number>
  children: Record<number, number[]>
  metadata?: Record<number, ProgressMetadata>
}

export interface RecordIdParts {
  contentId: number
  collection: {
    type: string
    id: number
  }
}

export interface ProgressSnapshot {
  last_update: number
  progress: number
  status: string
}

export interface ProgressContentFilter {
  aLaCarte?: boolean
  learningPaths?: boolean
}

export interface ProgressQueryOptions {
  onlyIds?: boolean
  include?: ProgressContentFilter
}

export interface StartedOrCompletedOptions {
  brand?: string
  contentTypes?: string[]
  parentId?: number
  include?: ProgressContentFilter
}
