/**
 * @module ProgressRow
 */

import { getDailySession } from '../content-org/learning-paths.ts'
import { getToday } from '../dateUtils.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2IntroVideo } from '../sanity'
import { addContextToContent } from '../contentAggregator.js'

export async function getMethodCard(brand) {
  const dailySession = await getDailySession(brand, getToday())
  console.log('Daily Session:', dailySession)
  const activeLearningPathId = dailySession.active_learning_path_id
  console.log('Active Learning Path Id:', activeLearningPathId)
  if (!activeLearningPathId) {
    const introVideo = await fetchMethodV2IntroVideo(brand)
    console.log('introVideo', introVideo)
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
      // *1000 is to match playlists which are saved in millisecond accuracy
      progressTimestamp: 0,
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

    console.log('Next Incomplete Lessons', nextIncompleteLesson)

    let ctaText, action
    if (noneCompleted) {
      ctaText = 'Start Session'
      action = getMethodActionCTA(nextIncompleteLesson)
      console.log(action)
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
  // const activePath = methodStructure.learningPaths.find(
  //   (learningPath) => learningPath.id === activePathId
  // )
  // const activePathWithLessons = { learningPathId: activePath.id, contentIds: activePath.children }
  //
  // const methodCardData = await getNextLearningPathLessonsForMethod(
  //   methodProgressContents,
  //   activePathWithLessons,
  //   dailySession
  // )
  // const methodCardIds = methodCardData?.next
  //   ? methodCardData.next.map((item) => item.contentIds).flat()
  //   : null // returns null if method intro video card
  //
  //   // will have to mock this. look inside for the format
  //   methodCardIds
  //     ? addContextToContent(fetchByRailContentIds, methodCardIds, 'progress-tracker', brand, {
  //         addProgressStatus: true,
  //         addProgressPercentage: true,
  //         addProgressTimestamp: true,
  //         // null is state for method intro video card
  //       })
  //     : methodCardData === null
  //       ? fetchMethodV2IntroVideo(brand)
  //       : Promise.resolve([]),
  //
  //
  //
  // const methodCard = methodCardIds
  //   ? {
  //       id: 0, // dummy id
  //       type: 'method-card',
  //       content_ids: [...methodCardContents],
  //       dailyComplete: methodCardData.dailyComplete,
  //       progressTimestamp: Math.max(
  //         ...methodProgressContents.map((item) => item.progressTimestamp || 0) // get most recent activity of all method progress items
  //       ),
  //     }
  //   : {
  //       ...methodCardContents,
  //       id: 0,
  //       progressTimestamp: 0,
  //     }
  //
  //
  // const contentType = getFormattedType(content.type, content.brand) //will be 'method'. item.type is either method-card or method-intro
  //
  // const ctaText = getMethodCardCTAText(content)
  //
  // const nextIncomplete = content.content_ids?.find((item) => item.progressStatus !== 'completed')
  //
  // const dailyCardBody = content.content_ids?.map((item) => {
  //   return {
  //     title: item.title,
  //     subtitle: item.subtitle,
  //     content: item,
  //     learningPathId: item.learningPathId, //might have to rename depending on addContextToContent output
  //     progressPercent: content.progressPercent,
  //     thumbnail: item.thumbnail,
  //     cta: {
  //       action: getMethodActionCTA(item),
  //     },
  //   }
  // })
  //
  //
  //
  //
  //
  // return {
  //   id: 0, // method card has no id
  //   progressType: 'method',
  //   pinned: content.pinned ?? false,
  //   header: contentType,
  //   body: dailyCardBody ?? {
  //     thumbnail: content.thumbnail,
  //     title: content.title,
  //     subtitle: `${content.difficulty_string} • ${content.artist_name}`,
  //   },
  //   cta: {
  //     text: ctaText,
  //     action: nextIncomplete ? getMethodActionCTA(nextIncomplete) : getMethodActionCTA(content),
  //   },
  //   // *1000 is to match playlists which are saved in millisecond accuracy
  //   progressTimestamp: content.progressTimestamp * 1000,
  // }
}

function getMethodActionCTA(item) {
  return {
    type: item.type,
    brand: item.brand,
    id: item.id,
    slug: item.slug,
  }
}
