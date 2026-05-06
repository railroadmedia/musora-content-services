import { initializeTestService } from '../initializeTests.js'
import SyncManager from '@/services/sync/manager'
import { SyncTelemetry } from '@/services/sync/telemetry'
import { makeDatabase, makeUserScope, makeContext, makeTelemetry } from '../unit/sync/helpers'
import db from '@/services/sync/repository-proxy'

export interface PushSpies {
  contentProgress: jest.SpyInstance
  practices: jest.SpyInstance
  likes: jest.SpyInstance
  userAwardProgress: jest.SpyInstance
  practiceDayNotes: jest.SpyInstance
}

export interface TestDBContext {
  pushSpies: PushSpies
}

export function initializeMockPushes(): PushSpies {
  return {
    contentProgress: jest.spyOn(db.contentProgress, 'requestPushUnsynced').mockImplementation(() => {}),
    practices: jest.spyOn(db.practices, 'requestPushUnsynced').mockImplementation(() => {}),
    likes: jest.spyOn(db.likes, 'requestPushUnsynced').mockImplementation(() => {}),
    userAwardProgress: jest.spyOn(db.userAwardProgress, 'requestPushUnsynced').mockImplementation(() => {}),
    practiceDayNotes: jest.spyOn(db.practiceDayNotes, 'requestPushUnsynced').mockImplementation(() => {}),
  }
}

export function initializeTestDB(): TestDBContext {
  const ctx: TestDBContext = { pushSpies: {} as PushSpies }

  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (key: string) => key === 'X-Sync-Intended-User-Id' ? '1' : null },
      json: () => Promise.resolve({
        meta: { since: null, max_updated_at: Date.now(), timestamp: Date.now() },
        entries: [],
      }),
    } as any)
  })

  let teardown: ((mode?: any) => Promise<void>) | null = null

  beforeEach(() => {
    initializeTestService()
    const userScope = makeUserScope()
    SyncTelemetry.setInstance(makeTelemetry(userScope))
    const manager = new SyncManager(userScope, makeContext(), () => makeDatabase())
    teardown = SyncManager.assignAndSetupInstance(manager)
    ctx.pushSpies = initializeMockPushes()
  })

  afterEach(async () => {
    await teardown?.('reset')
    teardown = null
    SyncTelemetry.clearInstance()
    ;(SyncManager as any).instance = null
  })

  return ctx
}
