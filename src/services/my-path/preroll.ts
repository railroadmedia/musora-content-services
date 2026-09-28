/**
 * @module MyPathPreroll
 */
import { fetchSanity, hasAnyMethodV2IntroCompleted } from '../sanity.js'
import { getPrerollFields } from '../../contentTypeConfig.js'
import { contentStatusCompleted, getProgressState } from '../contentProgress.js'
import { completeMethodIntroVideo, getActivePath } from './learning-paths'
import { SyncWriteDTO } from '../sync'
import { ContentProgress } from '../sync/models'
import { STATE } from '../sync/models/ContentProgress'

export interface PrerollInstructor {
  name: string
  slug: string
  thumbnail: string | null
  biography: string | null
  coach_card_image: string | null
  coach_profile_image: string | null
}

export interface PrerollVideoPlaybackEndpoint {
  vimeo_key?: string
  file: string
  height: number
  width: number
}

export interface PrerollVideoCaption {
  uri?: string
  link?: string
  type?: string
  name?: string
  language?: string
  display_language?: string
}

export interface PrerollVideo {
  version_name?: string
  type: string
  external_id?: string
  hlsManifestUrl?: string
  video_poster_image_url?: string
  video_playback_endpoints?: PrerollVideoPlaybackEndpoint[]
  captions?: PrerollVideoCaption[]
}

export interface Preroll {
  id: number
  title: string
  brand: string
  instructor: PrerollInstructor[] | null
  type: 'learning-path-intro'
  description: string | null
  thumbnail: string | null
  length_in_seconds: number | null
  video: PrerollVideo | null
}

/**
 * Returns the preroll's video data only. Whether to play it is decided by the client from the
 * local progress state of the `preroll_id` attached to each learning path lesson.
 */
export async function fetchPreroll(prerollId: number): Promise<Preroll | null> {
  const query = `*[_type == 'learning-path-intro' && railcontent_id == ${prerollId}][0...1]{
    ${getPrerollFields().join(', ')}
  }`
  return fetchSanity(query, false)
}

/**
 * Marks the preroll as watched, whether it was skipped or played to the end. Learning path
 * progress is never reset or imported here.
 */
export async function completePreroll(
  prerollId: number,
  brand: string,
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const [anyMethodIntroCompleted, activePath] = await Promise.all([
    hasAnyMethodV2IntroCompleted(),
    getActivePath(brand),
  ])

  const methodIntroWatchedOnAnotherBrand = anyMethodIntroCompleted && !activePath
  if (methodIntroWatchedOnAnotherBrand) {
    await completeMethodIntroVideo(null, brand)
  }

  const prerollState = await getProgressState(prerollId)
  return prerollState !== STATE.COMPLETED ? await contentStatusCompleted(prerollId) : null
}
