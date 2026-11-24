import { POST } from '../../infrastructure/http/HttpClient'
import { BASE_PATH } from './audioRecording'

export type GenerateFeedbackParams =
  | { surface: 'lesson'; contentId: number }
  | { surface: 'daily' | 'weekly'; date?: string }

export type GenerateFeedbackResponse =
  | { surface: 'lesson'; content_id: number; audio_session_id: number }
  | { surface: 'daily' | 'weekly'; period_start: string; period_end: string }

/**
 * System testing only (staging2): asks for the user's lesson, daily or weekly feedback now.
 * Daily and weekly default to today / this week in the user's time zone; `date` picks another day or week.
 * Answers 202 with what was queued; the feedback shows up on getLessonFeedback, getDailyFeedback or
 * getWeeklyFeedback 10 to 60 seconds later. Throws on 422 (the lesson has no graded take yet) and on
 * 404 (not available in this environment).
 */
export async function generateFeedback(
  params: GenerateFeedbackParams
): Promise<GenerateFeedbackResponse> {
  const body =
    params.surface === 'lesson'
      ? { surface: params.surface, content_id: params.contentId }
      : { surface: params.surface, ...(params.date ? { date: params.date } : {}) }

  return POST(`${BASE_PATH}/feedback/generate`, body)
}
