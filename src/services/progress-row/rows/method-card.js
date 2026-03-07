/**
 * @module ProgressRow
 */

import { getActivePath, fetchLearningPathLessons } from '../../content-org/learning-paths'
import { fetchMethodV2IntroVideo } from '../../sanity'
import { getProgressState } from '../../contentProgress'
import {COLLECTION_TYPE, STATE} from '../../sync/models/ContentProgress'

export async function getMethodCard(brand) {
  let introVideo
  try {
    introVideo = await fetchMethodV2IntroVideo(brand)
  } catch (error) {
    console.error('Error fetching method intro video:', error)
    return null
  }

  if (!introVideo) return null

  let introVideoProgressState
  try {
    introVideoProgressState = await getProgressState(introVideo?.id)
  } catch (error) {
    console.error('Error fetching progress state for method intro video:', error)
    return null
  }

  let activeLearningPath
  try {
    activeLearningPath = await getActivePath(brand)
  } catch (error) {
    console.error('Error fetching active learning path:', error)
    return null
  }

  if (introVideoProgressState !== STATE.COMPLETED || !activeLearningPath) {
    const timestamp = Math.floor(Date.now())
    const instructorText =
      introVideo.instructor?.length > 1
        ? 'Multiple Instructors'
        : introVideo.instructor?.[0]?.name || ''
    return {
      id: 1, // method card has no id
      type: 'method',
      header: 'Method',
      progressType: 'method',
      body: {
        thumbnail: introVideo.thumbnail,
        title: introVideo.title,
        subtitle: `${introVideo.difficulty_string} • ${instructorText}`,
      },
      cta: {
        text: 'Get Started',
        action: getMethodActionCTA(introVideo),
      },
      progressTimestamp: timestamp,
    }
  } else {
    let learningPath
    try {
      learningPath = await fetchLearningPathLessons(
        activeLearningPath.active_learning_path_id,
        brand,
        new Date()
      )
    } catch (e) {
      console.error('Failed to fetch learning path lessons', e)
      return null
    }

    if (!learningPath) return null

    const { ctaText, action } = getCtaAndText(learningPath)

    let maxProgressTimestamp = Math.max(
      ...learningPath?.children.map((lesson) => lesson.progressTimestamp)
    )

    if (!maxProgressTimestamp) {
      // active LP created_at is stored in seconds, so *1000 to match rest of cards
      maxProgressTimestamp = learningPath.active_learning_path_created_at * 1000
    }

    return {
      id: 1,
      type: COLLECTION_TYPE.LEARNING_PATH,
      progressType: 'method',
      header: 'Method',
      body: learningPath,
      content: learningPath, // FE uses this field for cards, MA uses `body`
      cta: {
        text: ctaText,
        action: action,
      },
      progressTimestamp: maxProgressTimestamp,
    }
  }
}

function getMethodActionCTA(item) {
  return {
    type: item.type ?? null,
    brand: item.brand ?? null,
    id: item.id ?? null,
    slug: item.slug ?? null,
    parent_id: item.parent_id ?? null,
  }
}

function getCtaAndText(learningPath) {
  const {
    allDailiesCompleted,
    anyDailiesStarted,
    noDailiesStarted,
    nextIncompleteDaily
  } = analyzeDailySession(learningPath)

  // get the first incomplete lesson from upcoming and next learning path lessons
  const nextLesson = [
    ...learningPath?.upcoming_lessons,
    ...learningPath?.next_learning_path_dailies,
  ]?.find((lesson) => lesson.progressStatus !== STATE.COMPLETED)

  let ctaText, action
  if (noDailiesStarted) {
    ctaText = 'Start Session'
    action = getMethodActionCTA(nextIncompleteDaily)
  } else if (anyDailiesStarted && !allDailiesCompleted) {
    ctaText = 'Continue Session'
    action = getMethodActionCTA(nextIncompleteDaily)
  } else if (allDailiesCompleted) {
    ctaText = nextLesson ? 'Start Next Lesson' : 'Browse Lessons'
    action = nextLesson
      ? getMethodActionCTA(nextLesson)
      : {
        type: 'method-complete',
        brand: learningPath.brand,
      }
  }

  return { action, ctaText }
}


function analyzeDailySession(learningPath) {
  const allDailies = [
    ...learningPath.previous_learning_path_dailies,
    ...learningPath.learning_path_dailies,
    ...learningPath.next_learning_path_dailies
  ]

  let allDailiesCompleted = true;
  let anyDailiesStarted = false;
  let noDailiesStarted = false;
  let nextIncompleteDaily = null;

  for (const lesson of allDailies) {
    switch (lesson.progressStatus) {
      case STATE.COMPLETED:
        anyDailiesStarted = true;
        noDailiesStarted = false;
        break;
      case STATE.STARTED:
        anyDailiesStarted = true;
        noDailiesStarted = false;
        allDailiesCompleted = false;
        if (!nextIncompleteDaily) {
          nextIncompleteDaily = lesson;
        }
        break;
      default:
        allDailiesCompleted = false;
        if (!nextIncompleteDaily) {
          nextIncompleteDaily = lesson;
        }
        break;
    }
    if (!allDailiesCompleted && anyDailiesStarted && nextIncompleteDaily) {
      break;
    }
  }

  return {
    allDailiesCompleted,
    anyDailiesStarted,
    noDailiesStarted,
    nextIncompleteDaily
  }
}

