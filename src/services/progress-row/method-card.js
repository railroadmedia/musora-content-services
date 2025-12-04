/**
 * @module ProgressRow
 */

import { getActivePath, fetchLearningPathLessons } from '../content-org/learning-paths'
import { getToday } from '../dateUtils.js'
import { fetchMethodV2IntroVideo } from '../sanity'
import { getProgressState } from '../contentProgress'
import { COLLECTION_TYPE } from '../sync/models/ContentProgress'

export async function getMethodCard(brand) {
  const introVideo = await fetchMethodV2IntroVideo(brand)
  const introVideoProgressState = await getProgressState(introVideo?.id)

  const activeLearningPath = await getActivePath(brand)

  if (introVideoProgressState !== 'completed' || !activeLearningPath) {
    //startLearningPath('drumeo', 422533)
    const timestamp = Math.floor(Date.now() / 1000)
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
    //TODO: Optimize loading of dailySessions/Path, should not need multiple requests
    const learningPath = await fetchLearningPathLessons(
      activeLearningPath.active_learning_path_id,
      brand,
      getToday()
    )

    const allCompleted = learningPath?.todays_lessons.every(
      (lesson) => lesson.progressStatus === 'completed'
    )

    const anyCompleted = learningPath?.todays_lessons.some(
      (lesson) => lesson.progressStatus === 'completed'
    )

    const noneCompleted = learningPath?.todays_lessons.every(
      (lesson) => lesson.progressStatus !== 'completed'
    )

    const nextIncompleteLesson = learningPath?.todays_lessons.find(
      (lesson) => lesson.progressStatus !== 'completed'
    )

    // get the first incomplete lesson from upcoming and next learning path lessons
    const nextLesson = [
      ...learningPath?.upcoming_lessons,
      ...learningPath?.next_learning_path_lessons,
    ]?.find((lesson) => lesson.progressStatus !== 'completed')

    let ctaText, action
    if (noneCompleted) {
      ctaText = 'Start Session'
      action = getMethodActionCTA(nextIncompleteLesson)
    } else if (anyCompleted && !allCompleted) {
      ctaText = 'Continue Session'
      action = getMethodActionCTA(nextIncompleteLesson)
    } else if (allCompleted) {
      ctaText = nextLesson ? 'Start Next Lesson' : 'Browse Lessons'
      action = nextLesson
        ? getMethodActionCTA(nextLesson)
        : {
            type: 'lessons',
            brand: brand,
          }
    }

    let maxProgressTimestamp = Math.max(
      ...learningPath?.children.map((lesson) => lesson.progressTimestamp)
    )
    
    if (!maxProgressTimestamp) {
      maxProgressTimestamp = learningPath.active_learning_path_created_at
    }

    return {
      id: 1,
      type: COLLECTION_TYPE.LEARNING_PATH,
      progressType: 'method',
      header: 'Method',
      body: learningPath,
      cta: {
        text: ctaText,
        action: action,
      },
      // *1000 is to match playlists which are saved in millisecond accuracy
      progressTimestamp: maxProgressTimestamp * 1000,
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
