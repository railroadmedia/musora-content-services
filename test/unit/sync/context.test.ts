jest.mock('../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../src/services/sync/repository-proxy', () => ({ db: {} }))
import { makeContext } from './helpers/index'
describe('SyncContext', () => {
  test('start calls start on all providers', () => {
    const context = makeContext() as any
    const providers = [
      context.session,
      context.connectivity,
      context.visibility,
      context.tabs,
      context.durability,
    ]
    providers.forEach(p => jest.spyOn(p, 'start'))
    context.start()
    providers.forEach(p => expect(p.start).toHaveBeenCalled())
  })
  test('stop calls stop on all providers', () => {
    const context = makeContext() as any
    const providers = [
      context.session,
      context.connectivity,
      context.visibility,
      context.tabs,
      context.durability,
    ]
    providers.forEach(p => jest.spyOn(p, 'stop'))
    context.stop()
    providers.forEach(p => expect(p.stop).toHaveBeenCalled())
  })
  test('session getter returns session provider', () => {
    const context = makeContext()
    expect(context.session).toBeDefined()
  })
  test('connectivity getter returns connectivity provider', () => {
    const context = makeContext()
    expect(context.connectivity).toBeDefined()
  })
  test('visibility getter returns visibility provider', () => {
    const context = makeContext()
    expect(context.visibility).toBeDefined()
  })
  test('tabs getter returns tabs provider', () => {
    const context = makeContext()
    expect(context.tabs).toBeDefined()
  })
  test('durability getter returns durability provider', () => {
    const context = makeContext()
    expect(context.durability).toBeDefined()
  })
})
