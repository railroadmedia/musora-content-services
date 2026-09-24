jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockPost = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: jest.fn(),
  POST: (...args: unknown[]) => mockPost(...args),
}))

import { createAudioChunkUploader } from '../../src/services/audioRecording/audioRecording'

describe('createAudioChunkUploader', () => {
  beforeEach(() => mockPost.mockReset().mockResolvedValue({}))

  test('re-uploads the fixed first chunk with its original sync anchors', async () => {
    const fixedChunk = new Blob(['fixed'])
    const uploader = await createAudioChunkUploader('user-audio/1_2026-09-24_120000/', 'webm', async () => ({
      feedChunk: jest.fn(),
      finish: async () => fixedChunk,
    }))

    await uploader.upload(1, new Blob(['first']), 5300, [0.1], {
      videoTimeStartMs: 300,
      chunkDurationMs: 5000,
      firstDataDelayMs: 40,
      levelDb: -30,
    })
    await uploader.finish()

    const reupload = mockPost.mock.calls[1][1] as FormData
    expect(reupload.get('index')).toBe('1')
    expect(reupload.get('video_time_ms')).toBe('5300')
    expect(reupload.get('video_time_start_ms')).toBe('300')
    expect(reupload.get('chunk_duration_ms')).toBe('5000')
    expect(reupload.get('level_db')).toBe('-30')
  })
})
