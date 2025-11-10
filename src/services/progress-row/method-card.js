/**
 * @module ProgressRow
 */

import {
  getDailySession,
  resetAllLearningPaths,
  startLearningPath,
} from '../content-org/learning-paths.ts'
import { getToday } from '../dateUtils.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2IntroVideo } from '../sanity'
import { addContextToContent } from '../contentAggregator.js'

export async function getMethodCard(brand) {
  const dailySession = await getDailySession(brand, getToday())
  const activeLearningPathId = dailySession?.active_learning_path_id
  resetAllLearningPaths()
  if (!activeLearningPathId) {
    // startLearningPath('drumeo', 422533)

    const introVideo = await fetchMethodV2IntroVideo(brand)
    const timestamp = Math.floor(Date.now() / 1000)
    return {
      id: 0, // method card has no id
      type: 'method',
      header: 'Method',
      body: {
        thumbnail: introVideo.thumbnail,
        title: introVideo.title,
        subtitle: `${introVideo.difficulty_string} • ${introVideo.artist_name}`,
      },
      cta: {
        text: 'Get Started',
        action: getMethodActionCTA(introVideo),
      },
      progressTimestamp: timestamp,
    }
  } else {
    const todayContentIds = dailySession.daily_session[0]?.content_ids || []
    const nextContentIds = dailySession.daily_session[1]?.content_ids || []

    const addContextParameters = {
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
    }
    const todaysLessons = await addContextToContent(
      fetchByRailContentIds,
      todayContentIds,
      addContextParameters
    )
    const nextLPLessons = await addContextToContent(
      fetchByRailContentIds,
      nextContentIds,
      addContextParameters
    )
    const allCompleted = todaysLessons.every((lesson) => lesson.progressStatus === 'completed')
    const anyCompleted = todaysLessons.some((lesson) => lesson.progressStatus === 'completed')
    const noneCompleted = todaysLessons.every((lesson) => lesson.progressStatus !== 'completed')

    const nextIncompleteLesson = todaysLessons.find(
      (lesson) => lesson.progressStatus !== 'completed'
    )
    const maxProgressTimestamp = Math.max(
      ...todaysLessons.map((lesson) => lesson.progressTimestamp)
    )

    let ctaText, action
    if (noneCompleted) {
      ctaText = 'Start Session'
      action = getMethodActionCTA(nextIncompleteLesson)
    } else if (anyCompleted && !allCompleted) {
      ctaText = 'Continue Session'
      action = getMethodActionCTA(nextIncompleteLesson)
    } else if (allCompleted) {
      //TODO:: get next lessons when all completed
      const nextAvailableLesson = null

      ctaText = nextAvailableLesson ? 'Start Next Lesson' : 'Browse Lessons'
      action = nextAvailableLesson
        ? getMethodActionCTA(nextAvailableLesson)
        : {
            type: 'lessons',
            brand: brand,
          }
    }
    return {
      id: 0, // method card has no id
      type: 'method',
      progressType: 'content',
      header: 'Method',
      body: {
        todays_lessons: todaysLessons,
        next_learning_path_lessons: nextLPLessons,
      },
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
  }
}
