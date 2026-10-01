/**
 * @module MyPathPreroll
 */
import { contentStatusCompleted, getProgressState } from '../contentProgress.js'
import { SyncWriteDTO } from '../sync'
import { ContentProgress } from '../sync/models'
import { STATE } from '../sync/models/ContentProgress'
import { fetchQuizAnswers } from '@/services/my-path/placement-quiz'

export async function completePreroll(
  prerollId: number
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  return await completeIfNotCompleted(prerollId)
}

interface completeMyPathIntroVideo {
  placement_quiz: any
  recommended_content: any
}

export async function completeMyPathIntroVideo(
  introVideoId: number,
  brand: string,
): Promise<any> {
  completeIfNotCompleted(introVideoId) // no need to wait for result

  return await fetchQuizAnswers(brand)
}

async function completeIfNotCompleted(
  contentId: number,
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const status = await getProgressState(contentId)
  return status !== STATE.COMPLETED ? await contentStatusCompleted(contentId) : null
}
