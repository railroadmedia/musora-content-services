/**
 * @module ProgressRow
 */
import { getAllStartedOrCompleted, getProgressStateByIds } from '../../contentProgress.js'
import { addContextToContent } from '../../contentAggregator.js'
import { fetchByRailContentIds, fetchShows } from '../../sanity.js'
import {
  addAwardTemplateToContent,
  awardTemplate,
  collectionLessonTypes,
  getFormattedType,
  recentTypes,
  showsLessonTypes,
  songs,
} from '../../../contentTypeConfig.js'
import { getTimeRemainingUntilLocal } from '../../dateUtils.js'
import { findIncompleteLesson } from '../../userActivity.js'

/**
 * Fetch any content IDs with some progress, include the userPinnedItem,
 * remove any content IDs that already exist in playlistEngagedOnContent,
 * and generate a map of the cards keyed by the content IDs
 */
export async function getContentCardMap(brand, limit, playlistEngagedOnContent, userPinnedItem ){
  let recentContentIds = await getAllStartedOrCompleted({ brand: brand, limit })
  if (userPinnedItem?.progressType === 'content') {
    recentContentIds.push(userPinnedItem.id)
  }
  if (playlistEngagedOnContent) {
    for (const item of playlistEngagedOnContent) {
      const parentIds = item.parent_content_data || []
      recentContentIds = recentContentIds.filter(id => id !== item.id && !parentIds.includes(id))
    }
  }
  let contents = recentContentIds.length > 0
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
  contents = addAwardTemplateToContent(contents)

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
  const allRecentTypeSet = new Set(Object.values(recentTypes).flat())
  contents.forEach((content) => {
    const type = content.type
    if (!allRecentTypeSet.has(type) && !showsLessonTypes.includes(type)) return
    let childHasParent = Array.isArray(content.parent_content_data) && content.parent_content_data.length > 0
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
  let ctaText = getDefaultCTATextForContent(content, contentType)

  content.completed_children = await getCompletedChildren(content, contentType)

  if (content.type === 'guided-course') {
    const nextLessonPublishedOn = content.children.find(
      (child) => child.id === content.navigateTo.id
    )?.published_on
    let isLocked = new Date(nextLessonPublishedOn) > new Date()
    if (isLocked) {
      content.is_locked = true
      const timeRemaining = getTimeRemainingUntilLocal(nextLessonPublishedOn, {
        withTotalSeconds: true,
      })
      content.time_remaining_seconds = timeRemaining.totalSeconds
      ctaText = 'Next lesson in ' + timeRemaining.formatted
    } else if (
      !content.progressStatus ||
      content.progressStatus === 'not-started' ||
      content.progressPercentage === 0
    ) {
      ctaText = 'Start Course'
    }
  }

  if (contentType === 'show') {
    const shows = await fetchShows(content.brand, content.type)
    const showIds = shows.map((item) => item.id)
    const progressOnItems = await getProgressStateByIds(showIds)
    const completedShows = content.completed_children
    const progressTimestamp = content.progressTimestamp
    const wasPinned = content.pinned ?? false
    if (content.progressStatus === 'completed') {
      // this could be handled more gracefully if there was a parent content type for shows
      // Update Dec 3rd. We updated almost everything to the DocumentaryType :D, but there's still a few
      const nextByProgress = findIncompleteLesson(progressOnItems, content.id, content.type)
      content = shows.find((lesson) => lesson.id === nextByProgress)
      content.completed_children = completedShows
      content.progressTimestamp = progressTimestamp
      content.pinned = wasPinned
    }
    content.child_count = shows.length
    content.progressPercentage = Math.round((completedShows / shows.length) * 100)
    if (completedShows === shows.length) {
      ctaText = 'Revisit Show'
    }
  }
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
      badge_logo: content.logo ?? null,
      badge: content.badge ?? null,
      badge_template: awardTemplate[def.brand],
      isLocked: content.is_locked ?? false,
      subtitle:
        collectionLessonTypes.includes(content.type) || content.lesson_count > 1
          ? `${content.completed_children} of ${content.lesson_count ?? content.child_count} Lessons Complete`
          : contentType === 'lesson' && isLive === false
            ? `${content.progressPercentage}% Complete`
            : `${content.difficulty_string} • ${content.artist_name}`,
    },
    cta: {
      text: ctaText,
      timeRemainingToUnlockSeconds: content.time_remaining_seconds ?? null,
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

function getDefaultCTATextForContent(content, contentType) {
  let ctaText = 'Continue'
  if (content.progressStatus === 'completed') {
    if (
      contentType === songs[content.brand] ||
      contentType === 'play along' ||
      contentType === 'jam track'
    )
      ctaText = 'Replay Song'
    if (contentType === 'lesson') ctaText = 'Revisit Lesson'
    if (contentType === 'song tutorial' || collectionLessonTypes.includes(content.type))
      ctaText = 'Revisit Lessons'
    if (contentType === 'course-collection') ctaText = 'View Lessons'
  }
  return ctaText
}

async function getCompletedChildren(content, contentType) {
  let completedChildren = null
  if (contentType === 'show') {
    const shows = await addContextToContent(fetchShows, content.brand, content.type, {
      addProgressStatus: true,
    })
    completedChildren = Object.values(shows).filter(
      (show) => show.progressStatus === 'completed'
    ).length
  } else if (content.lesson_count > 0) {
    const lessonIds = getLeafNodes(content)
    const progressOnItems = await getProgressStateByIds(lessonIds)
    completedChildren = Object.values(progressOnItems).filter(
      (value) => value === 'completed'
    ).length
  }
  return completedChildren
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
