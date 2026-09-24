import { GET } from '../../infrastructure/http/HttpClient'

export interface RecordingPlaybackUrl {
  url: string | null
  expires_at: string | null
  mime_type: string | null
}

export interface RecordingPlaybackUrlOptions {
  original?: boolean
  download?: boolean
}

/**
 * Resolves to `url: null` while the take is still being recorded; fall back to
 * getCombinedAudioUrl() then. A presigned link must be fetched without credentials.
 */
export async function getRecordingPlaybackUrl(
  folder: string,
  options: RecordingPlaybackUrlOptions = {}
): Promise<RecordingPlaybackUrl> {
  const params = new URLSearchParams({ folder })
  if (options.original) params.set('format', 'original')
  if (options.download) params.set('download', '1')

  return GET(`/api/audio-recording/v1/playback-url?${params}`)
}
