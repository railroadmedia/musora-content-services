export interface SmartEmbedUrl {
  brand: string
  contentId: number
  originalUrl: string
}

export interface SmartEmbedContent {
  id: number
  sanityId: string
  title: string
  type: string
  thumbnail: string | null
  instructorName: string | null
  artistName: string | null
  difficulty: string | null
  lengthInSeconds: number | null
  brand: string
  slug: string
  permissionId: number | null
  membershipTier: string | null
  publishedOn: string | null
  status: string
  liveEventStartTime?: string | null
  liveEventEndTime?: string | null
}

export interface SmartEmbedResult {
  content: SmartEmbedContent
  originalUrl: string
}

export interface SmartEmbedViewerState {
  progressState: 'started' | 'completed' | ''
  needsAccess: boolean
  membershipRequired: boolean
}

export interface SmartEmbedWithViewerState extends SmartEmbedResult {
  viewerState: SmartEmbedViewerState
}

export interface ProcessSmartEmbedsOptions {
  includeViewerState?: boolean
  maxEmbeds?: number
}

export interface ProcessSmartEmbedsResult {
  embeds: SmartEmbedResult[] | SmartEmbedWithViewerState[]
  unsupported: string[]
}
