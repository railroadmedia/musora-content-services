jest.mock('../../src/services/sanity.js', () => ({ fetchByRailContentIds: jest.fn() }))
jest.mock('../../src/lib/sanity/decorators/base.ts', () => ({ decorateAsync: jest.fn() }))

import { getSupportedFormats } from '../../src/services/audioRecording/audioRecording'

const withSupported = (types: string[]) => {
  (global as any).MediaRecorder = { isTypeSupported: (type: string) => types.includes(type) }
}

describe('getSupportedFormats', () => {
  afterEach(() => {
    delete (global as any).MediaRecorder
  })

  test('prefers WebM Opus when the browser can record both WebM and MP4', () => {
    withSupported(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'])

    expect(getSupportedFormats()[0]).toBe('audio/webm;codecs=opus')
  })

  test('falls back to MP4 when WebM is unavailable', () => {
    withSupported(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'])

    expect(getSupportedFormats()[0]).toBe('audio/mp4;codecs=mp4a.40.2')
  })

  test('returns nothing without MediaRecorder', () => {
    expect(getSupportedFormats()).toEqual([])
  })
})
