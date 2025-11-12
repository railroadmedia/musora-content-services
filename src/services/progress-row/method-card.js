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
  //resetAllLearningPaths()
  if (!activeLearningPathId) {
    //startLearningPath('drumeo', 422533)

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
    const [todaysDailies, nextLPDailies] = await Promise.all([
      todayContentIds
        ? addContextToContent(
          fetchByRailContentIds,
          todayContentIds,
          addContextParameters
        )
        : Promise.resolve([]),
      nextContentIds
        ? addContextToContent(
          fetchByRailContentIds,
          nextContentIds,
          addContextParameters
        )
        : Promise.resolve([]),
    ])
    const allCompleted = todaysDailies.every((lesson) => lesson.progressStatus === 'completed')
    const anyCompleted = todaysDailies.some((lesson) => lesson.progressStatus === 'completed')
    const noneCompleted = todaysDailies.every((lesson) => lesson.progressStatus !== 'completed')

    const nextIncompleteDaily = todaysDailies.find(
      (lesson) => lesson.progressStatus !== 'completed'
    )
    // todo max timestamp needs to be calc'd from all method progress timestamps, not just todays dailies
    let maxProgressTimestamp = Math.max(...todaysDailies.map((lesson) => lesson.progressTimestamp))
    if (!maxProgressTimestamp) {
      maxProgressTimestamp = dailySession.active_learning_path_created_at
    }
    let ctaText, action
    if (noneCompleted) {
      ctaText = 'Start Session'
      action = getMethodActionCTA(nextIncompleteDaily)
    } else if (anyCompleted && !allCompleted) {
      ctaText = 'Continue Session'
      action = getMethodActionCTA(nextIncompleteDaily)
    } else if (allCompleted) {
      const activePathLessonsProgress = await addContextToContent(
        fetchByRailContentId,
        activeLearningPathId,
        {...addContextParameters, dataField: 'child'},
      )
      const nextAvailableLesson = activePathLessonsProgress.child.find(
        (lesson) => lesson.progressStatus !== 'completed'
      )

      ctaText = nextAvailableLesson ? 'Start Next Lesson' : 'Browse Lessons'
      action = nextAvailableLesson
        ? getMethodActionCTA(nextAvailableLesson)
        : {
            type: 'lessons',
            brand: brand,
          }
    }
    return {
      id: 0,
      type: 'method',
      progressType: 'content',
      header: 'Method',
      body: {
        todays_lessons: todaysDailies,
        next_learning_path_lessons: nextLPDailies,
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
    type: 'learning-path-lesson-v2',
    brand: item.brand,
    id: item.id,
    slug: item.slug,
  }
}
