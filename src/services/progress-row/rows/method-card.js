/**
 * @module ProgressRow
 */

import { getActivePath, fetchLearningPathLessons } from '../../content-org/learning-paths'
import { fetchMethodV2IntroVideo } from '../../sanity'
import { getProgressState } from '../../contentProgress'
import {COLLECTION_TYPE, STATE} from '../../sync/models/ContentProgress'

export async function getMethodCard(brand) {
  const introVideo = await fetchMethodV2IntroVideo(brand)

  if (!introVideo) {
    return null
  }

  const introVideoProgressState = await getProgressState(introVideo?.id)

  const activeLearningPath = await getActivePath(brand)

  if (introVideoProgressState !== STATE.COMPLETED || !activeLearningPath) {
    const timestamp = -1 // set negative so later filters out naturally if not pinned
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
    const learningPath = await fetchLearningPathLessons(
      activeLearningPath.active_learning_path_id,
      brand,
      new Date()
    )

    if (!learningPath) {
      return null
    }

    // need to calculate based on all dailies
    const allDailies = [
      ...learningPath.previous_learning_path_dailies,
      ...learningPath.learning_path_dailies,
      ...learningPath.next_learning_path_dailies
    ]

    let allDailiesCompleted = true;
    let anyDailiesCompleted = false;
    let noDailiesCompleted = true;
    let nextIncompleteDaily = null;

    for (const lesson of allDailies) {
      if (lesson.progressStatus === STATE.COMPLETED) {
        anyDailiesCompleted = true;
        noDailiesCompleted = false;
      } else {
        allDailiesCompleted = false;
        if (!nextIncompleteDaily) {
          nextIncompleteDaily = lesson;
        }
      }
      if (!allDailiesCompleted && anyDailiesCompleted && nextIncompleteDaily) {
        break;
      }
    }

    // get the first incomplete lesson from upcoming and next learning path lessons
    const nextLesson = [
      ...learningPath?.upcoming_lessons,
      ...learningPath?.next_learning_path_dailies,
    ]?.find((lesson) => lesson.progressStatus !== STATE.COMPLETED)

    let ctaText, action
    if (noDailiesCompleted) {
      ctaText = 'Start Session'
      action = getMethodActionCTA(nextIncompleteDaily)
    } else if (anyDailiesCompleted && !allDailiesCompleted) {
      ctaText = 'Continue Session'
      action = getMethodActionCTA(nextIncompleteDaily)
    } else if (allDailiesCompleted) {
      ctaText = nextLesson ? 'Start Next Lesson' : 'Browse Lessons'
      action = nextLesson
        ? getMethodActionCTA(nextLesson)
        : {
            type: 'method-complete',
            brand,
          }
    }

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
    type: item.type,
    brand: item.brand,
    id: item.id,
    slug: item.slug,
    parent_id: item.parent_id,
  }
}
