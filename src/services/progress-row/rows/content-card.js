/**
 * @module ProgressRow
 */
import { getAllStartedOrCompleted, getProgressStateByIds } from '../../contentProgress.js'
import { addContextToContent } from '../../contentAggregator.js'
import { fetchByRailContentIds, fetchShows } from '../../sanity.js'
import {
  postProcessBadge,
  collectionLessonTypes,
  getFormattedType,
  recentTypes,
  showsLessonTypes,
  songs,
} from '../../../contentTypeConfig.js'
import { PARENT_ID_TOP_LEVEL } from '../../sync/models/ContentProgress'

/**
 * Fetch any content IDs with some progress, include the userPinnedItem,
 * and generate a map of the cards keyed by the content IDs
 */
export async function getContentCardMap(brand, limit, userPinnedItem) {
  const metadata = {
    brand: brand,
    contentTypes: Object.values(recentTypes.homeRow),
    parentId: PARENT_ID_TOP_LEVEL,
  }
  let recentContentIds = await getAllStartedOrCompleted({ metadata, limit })
  if (userPinnedItem?.progressType === 'content') {
    recentContentIds.push(userPinnedItem.id)
  }

  let contents =
    recentContentIds.length > 0
      ? await addContextToContent(
          fetchByRailContentIds,
          recentContentIds,
          'progress-tracker',
          brand,
          {
            addNavigateTo: true,
            addProgressStatus: true,
            addProgressPercentage: true,
            addProgressTimestamp: true,
          }
        )
      : []
  contents = postProcessBadge(contents)

  const contentCards = await Promise.all(generateContentPromises(contents))
  return contentCards.reduce((contentMap, content) => {
    contentMap.set(content.id, content)
    return contentMap
  }, new Map())
}

function generateContentPromises(contents) {
  const promises = []
  if (!contents) return promises
  const existingShows = new Set()
  const allRecentTypeSet = new Set(Object.values(recentTypes.homeRow))
  allRecentTypeSet.delete('learning-path-v2') // we do this to remove from homepage, until we allow a-la-carte learning paths
  contents.forEach((content) => {
    const type = content.type
    if (!allRecentTypeSet.has(type)) return
    let childHasParent =
      Array.isArray(content.parent_content_data) && content.parent_content_data.length > 0
    if (!childHasParent) {
      promises.push(processContentItem(content))
      if (showsLessonTypes.includes(type)) {
        // Shows don't have a parent to link them, but need to be handled as if they're a set of children
        existingShows.add(type)
      }
    }
  })

  return promises
}

export async function processContentItem(content) {
  const contentType = getFormattedType(content.type, content.brand)
  const isLive = content.isLive ?? false
  const ctaText = getDefaultCTATextForContent(content, contentType)

  const { completedChildren, allChildren } = await getCompletedChildren(content, contentType)
  content.completed_children = completedChildren
  content.all_children = allChildren

  return {
    id: content.id,
    progressType: 'content',
    header: contentType,
    pinned: content.pinned ?? false,
    content: content,
    body: {
      progressPercent: isLive ? undefined : content.progressPercentage,
      thumbnail: content.thumbnail,
      title: content.title,
      isLive: isLive,
      brand: content.brand,
      badge: content.badge ?? null,
      badge_rear: content.badge_rear ?? null,
      badge_logo: content.badge_logo ?? null,
      badge_template: content.badge_template ?? null,
      badge_template_rear: content.badge_template_rear ?? null,
      isLocked: content.is_locked ?? false,
      subtitle: getSubtitle(content, contentType, isLive),
    },
    cta: {
      text: ctaText,
      action: {
        type: content.type,
        brand: content.brand,
        id: content.id,
        slug: content.slug,
        child: content.navigateTo,
      },
    },
    progressTimestamp: content.progressTimestamp,
  }
}

function getSubtitle(content, contentType, isLive) {
  if (collectionLessonTypes.includes(content.type) || content.lesson_count > 1) {
    return `${content.completed_children ?? 0} of ${content.all_children ?? content.lesson_count ?? content.child_count} Lessons Complete`
  }
  if ((contentType === 'lesson' || contentType === 'show') && !isLive) {
    return `${content.progressPercentage}% Complete`
  }
  return `${content.difficulty_string} • ${content.artist_name}`
}

function getDefaultCTATextForContent(content, contentType) {
  const notStarted =
    !content.progressStatus ||
    content.progressStatus === 'not-started' ||
    content.progressPercentage === 0
  if (content.type === 'guided-course' && notStarted) return 'Start Course'

  if (content.progressStatus === 'completed') {
    if (
      contentType === songs[content.brand] ||
      contentType === 'play along' ||
      contentType === 'jam track'
    )
      return 'Replay Song'
    if (contentType === 'lesson' || contentType === 'show') return 'Revisit Lesson'
    if (contentType === 'song tutorial' || collectionLessonTypes.includes(content.type))
      return 'Revisit Lessons'
    if (contentType === 'course-collection') return 'View Lessons'
  }

  return 'Continue'
}

async function getCompletedChildren(content, contentType) {
  let completedChildren = 0
  let allChildren = 0

  if (contentType === 'show') {
    const shows = await addContextToContent(fetchShows, content.brand, content.type, {
      addProgressStatus: true,
    })
    completedChildren = Object.values(shows).filter(
      (show) => show.progressStatus === 'completed'
    ).length
    allChildren = Object.values(shows).length
  } else if (content.children && content.children.length > 0) {
    const lessonIds = getLeafNodes(content)
    const progressOnItems = await getProgressStateByIds(lessonIds)
    completedChildren = Array.from(progressOnItems.values()).filter(
      (value) => value === 'completed'
    ).length
    allChildren = lessonIds.length
  }

  return { completedChildren, allChildren }
}

function getLeafNodes(content) {
  const ids = []
  function traverse(children) {
    for (const item of children) {
      if (item.children) {
        traverse(item.children) // Recursively handle nested lessons
      } else if (item.id) {
        ids.push(item.id)
      }
    }
  }
  if (content && Array.isArray(content.children)) {
    traverse(content.children)
  }
  return ids
}
