export interface GetAllQueryOptions {
  onlyIds?: boolean
  include?: {
    aLaCarte?: boolean
    learningPaths?: boolean
  }
}

export interface QueryMetadata {
  brand?: string
  contentTypes?: string[]
  parentId?: number
}

export interface StartedOrCompletedOptions extends QueryMetadata {
  include?: GetAllQueryOptions['include']
}
