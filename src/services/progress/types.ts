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
