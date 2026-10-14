import { GET } from '../../infrastructure/http/HttpClient'

export interface RecordingPlaybackUrl {
  url: string | null
  expires_at: string | null
  mime_type: string | null
  playback_status: 'pending' | 'ready' | 'failed' | null
}

export interface RecordingPlaybackUrlOptions {
  original?: boolean
  download?: boolean
}

/**
 * Resolves to `url: null` until the take's playback copy is ready (see `playback_status`).
 * A presigned link must be fetched without credentials.
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
