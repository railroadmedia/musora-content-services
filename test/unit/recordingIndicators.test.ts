jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

const mockGet = jest.fn()
jest.mock('../../src/infrastructure/http/HttpClient.ts', () => ({
  GET: (...args: unknown[]) => mockGet(...args),
  POST: jest.fn(),
}))

import {
  getRecordedContentIds,
  getRecordingIndicators,
} from '../../src/services/audioRecording/audioRecording'

describe('getRecordingIndicators', () => {
  beforeEach(() =>
    mockGet.mockReset().mockResolvedValue({ content_ids: [100, 200], processing_content_ids: [200] })
  )

  test('returns the recorded lessons and the ones with a take still saving', async () => {
    const result = await getRecordingIndicators('2026-10-12')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/audio-recording/v1/recorded-content-ids?start_date=2026-10-12'
    )
    expect(result).toEqual({ content_ids: [100, 200], processing_content_ids: [200] })
  })

  test('passes a date range', async () => {
    await getRecordingIndicators('2026-10-06', '2026-10-12')

    expect(mockGet.mock.calls[0][0]).toContain('start_date=2026-10-06&end_date=2026-10-12')
  })

  test('keeps getRecordedContentIds returning only the recorded lesson ids', async () => {
    expect(await getRecordedContentIds('2026-10-12')).toEqual([100, 200])
  })
})
