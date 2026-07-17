import { getProgressStateByIds } from '../contentProgress.js'
import { getPermissionsAdapter } from '../permissions/index'
import { plusMembershipTier } from '../../contentTypeConfig.js'
import { SmartEmbedContent, SmartEmbedViewerState, SmartEmbedResult, SmartEmbedWithViewerState } from './types'

interface ContentForPermissionCheck {
  permission_id?: number[]
  membership_tier?: string | null
}

export async function getViewerState(
  contentId: number,
  content: SmartEmbedContent
): Promise<SmartEmbedViewerState> {
  const states = await getViewerStates([contentId], [content])
  return states.get(contentId) || {
    progressState: '',
    needsAccess: false,
    membershipRequired: false,
  }
}

export async function getViewerStates(
  contentIds: number[],
  contents: SmartEmbedContent[]
): Promise<Map<number, SmartEmbedViewerState>> {
  if (contentIds.length === 0) {
    return new Map()
  }

  const contentMap = new Map<number, SmartEmbedContent>()
  for (const content of contents) {
    contentMap.set(content.id, content)
  }

  const [progressStates, userPermissions] = await Promise.all([
    getProgressStateByIds(contentIds),
    getPermissionsAdapter().fetchUserPermissions(),
  ])

  const adapter = getPermissionsAdapter()
  const result = new Map<number, SmartEmbedViewerState>()

  for (const contentId of contentIds) {
    const content = contentMap.get(contentId)

    if (!content) {
      result.set(contentId, {
        progressState: '',
        needsAccess: false,
        membershipRequired: false,
      })
      continue
    }

    const progressState = progressStates?.get(contentId) || ''

    const contentForCheck: ContentForPermissionCheck = {
      permission_id: content.permissionId ? [content.permissionId] : undefined,
      membership_tier: content.membershipTier,
    }

    const needsAccess = adapter.doesUserNeedAccess(contentForCheck, userPermissions)

    const membershipRequired = content.membershipTier === plusMembershipTier

    result.set(contentId, {
      progressState: progressState as SmartEmbedViewerState['progressState'],
      needsAccess,
      membershipRequired,
    })
  }

  return result
}

export async function enrichWithViewerState(
  embedResults: SmartEmbedResult[]
): Promise<SmartEmbedWithViewerState[]> {
  if (embedResults.length === 0) {
    return []
  }

  const contentIds = embedResults.map((r) => r.content.id)
  const contents = embedResults.map((r) => r.content)
  const viewerStates = await getViewerStates(contentIds, contents)

  return embedResults.map((result) => ({
    ...result,
    viewerState: viewerStates.get(result.content.id) || {
      progressState: '',
      needsAccess: false,
      membershipRequired: false,
    },
  }))
}
