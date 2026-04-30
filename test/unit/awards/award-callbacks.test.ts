import type { AwardCallbackPayload, ProgressCallbackPayload, UnregisterFunction } from '../../../src/services/awards/types.d.ts'
import { registerAwardCallback, registerProgressCallback } from '../../../src/services/awards/award-callbacks.js'
import { awardEvents } from '../../../src/services/awards/internal/award-events.js'
jest.mock('../../../src/services/awards/award-query.js', () => ({
  ...jest.requireActual('../../../src/services/awards/award-query.js'),
  getBadgeFields: jest.fn().mockReturnValue({
    badge: 'https://cdn.example.com/badge.png',
    badge_rear: 'https://cdn.example.com/badge_rear.png',
    badge_logo: 'https://cdn.example.com/logo.png',
    badge_template: 'template_front',
    badge_template_rear: 'template_rear',
    badge_template_unearned: 'template_unearned',
  })
}))
interface AwardGrantedEmitPayload {
  awardId: string
  definition: {
    name: string
    brand: string
    content_type: string
    type: string
    is_active: boolean
  }
  completionData: {
    completed_at: string
    days_user_practiced: number
    practice_minutes: number
    content_title: string
  }
  popupMessage: string
}
const mockPayload: AwardGrantedEmitPayload = {
  awardId: 'award-123',
  definition: {
    name: 'Test Award',
    brand: 'drumeo',
    content_type: 'guided-course',
    type: 'content-award',
    is_active: true,
  },
  completionData: {
    completed_at: '2024-01-01T00:00:00Z',
    days_user_practiced: 14,
    practice_minutes: 180,
    content_title: 'Blues Foundations',
  },
  popupMessage: 'Congratulations!'
}
describe('registerAwardCallback', () => {
  let unregister: UnregisterFunction

  afterEach(() => {
    unregister?.()
    awardEvents.removeAllListeners()
  })

  test('throws if callback is not a function', () => {
    expect(() => registerAwardCallback('not a function' as any)).toThrow(
      'registerAwardCallback requires a function'
    )
  })

  test('returns an unregister function', () => {
    unregister = registerAwardCallback(jest.fn())
    expect(typeof unregister).toBe('function')
  })

  test('callback is invoked with correctly shaped award object when awardGranted fires', async () => {
    const callback = jest.fn() as jest.MockedFunction<(award: AwardCallbackPayload) => void>
    unregister = registerAwardCallback(callback)
    awardEvents.emitAwardGranted(mockPayload)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      awardId: 'award-123',
      name: 'Test Award',
      brand: 'drumeo',
      contentType: 'guided-course',
      hasCertificate: true,
      isCompleted: true,
      completedAt: '2024-01-01T00:00:00Z',
      completionData: expect.objectContaining({
        content_title: 'Blues Foundations',
        days_user_practiced: 14,
        practice_minutes: 180,
        message: 'Congratulations!',
      })
    }))
  })

  test('callback is not invoked after unregister is called', async () => {
    const callback = jest.fn()
    unregister = registerAwardCallback(callback)
    unregister()
    awardEvents.emitAwardGranted(mockPayload)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(callback).not.toHaveBeenCalled()
  })

  test('registering a second callback replaces the first', async () => {
    const firstCallback = jest.fn()
    const secondCallback = jest.fn()
    registerAwardCallback(firstCallback)
    unregister = registerAwardCallback(secondCallback)
    awardEvents.emitAwardGranted(mockPayload)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).toHaveBeenCalled()
  })

  test('throws if callback is not a function', () => {
    expect(() => registerProgressCallback('not a function' as any)).toThrow(
      'registerProgressCallback requires a function'
    )
  })

  test('returns an unregister function', () => {
    unregister = registerProgressCallback(jest.fn())
    expect(typeof unregister).toBe('function')
  })

  test('callback is invoked with awardId and progressPercentage when awardProgress fires', () => {
    const callback = jest.fn() as jest.MockedFunction<(progress: ProgressCallbackPayload) => void>
    unregister = registerProgressCallback(callback)
    awardEvents.emitAwardProgress({ awardId: 'award-123', progressPercentage: 50 })
    expect(callback).toHaveBeenCalledWith({
      awardId: 'award-123',
      progressPercentage: 50,
    })
  })
})

describe('registerProgressCallback', () => {
  let unregister: UnregisterFunction

  afterEach(() => {
    unregister?.()
    awardEvents.removeAllListeners()
  })

  test.todo('throws if callback is not a function')
  test.todo('returns an unregister function')
  test.todo('callback is invoked with awardId and progressPercentage when awardProgress fires')
  test.todo('callback is not invoked after unregister is called')
})
