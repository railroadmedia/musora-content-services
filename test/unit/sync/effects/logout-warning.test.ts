import createLogoutWarningEffect from '../../../../src/services/sync/effects/logout-warning'

// ---

function makeMockStore(model: any = { table: 'test' }) {
  let handler: ((records: any[]) => void) | null = null

  const store = {
    model,
    collection: {
      query: jest.fn().mockReturnValue({
        observe: jest.fn().mockReturnValue({
          subscribe: (h: (records: any[]) => void) => {
            handler = h
            return { unsubscribe: () => { handler = null } }
          },
        }),
      }),
    },
  } as any

  const push = (records: any[]) => handler?.(records)

  return { store, push }
}

// ---

describe('notification on unsynced records', () => {
  test('notifyCallback called when unsynced records appear', () => {
    const notify = jest.fn()
    const { store, push } = makeMockStore()

    createLogoutWarningEffect(notify)(null as any, [store])
    push([{ id: 'rec-1' }])

    expect(notify).toHaveBeenCalledTimes(1)
  })

  test('notifyCallback called with the model class of the store', () => {
    const notify = jest.fn()
    const model = { table: 'content_progress' }
    const { store, push } = makeMockStore(model)

    createLogoutWarningEffect(notify)(null as any, [store])
    push([{ id: 'rec-1' }])

    expect(notify.mock.calls[0][0]).toContain(model)
  })

  test('notifyCallback called with empty array when records go back to zero', () => {
    const notify = jest.fn()
    const { store, push } = makeMockStore()

    createLogoutWarningEffect(notify)(null as any, [store])
    push([{ id: 'rec-1' }])
    push([])

    expect(notify).toHaveBeenCalledTimes(2)
    expect(notify.mock.calls[1][0]).toHaveLength(0)
  })

  test('model removed from unsyncedModels when records cleared', () => {
    const notify = jest.fn()
    const model = { table: 'content_progress' }
    const { store, push } = makeMockStore(model)

    createLogoutWarningEffect(notify)(null as any, [store])
    push([{ id: 'rec-1' }])
    push([])

    expect(notify.mock.calls[1][0]).not.toContain(model)
  })
})

// ---

describe('multiple stores', () => {
  test('tracks unsynced models across stores independently', () => {
    const notify = jest.fn()
    const modelA = { table: 'content_progress' }
    const modelB = { table: 'content_likes' }
    const storeA = makeMockStore(modelA)
    const storeB = makeMockStore(modelB)

    createLogoutWarningEffect(notify)(null as any, [storeA.store, storeB.store])

    storeA.push([{ id: 'rec-1' }])
    storeB.push([{ id: 'rec-2' }])

    const lastCall = notify.mock.calls[notify.mock.calls.length - 1][0]
    expect(lastCall).toContain(modelA)
    expect(lastCall).toContain(modelB)
  })

  test('clears only the model whose records were resolved', () => {
    const notify = jest.fn()
    const modelA = { table: 'content_progress' }
    const modelB = { table: 'content_likes' }
    const storeA = makeMockStore(modelA)
    const storeB = makeMockStore(modelB)

    createLogoutWarningEffect(notify)(null as any, [storeA.store, storeB.store])

    storeA.push([{ id: 'rec-1' }])
    storeB.push([{ id: 'rec-2' }])
    storeA.push([]) // storeA resolved

    const lastCall = notify.mock.calls[notify.mock.calls.length - 1][0]
    expect(lastCall).not.toContain(modelA)
    expect(lastCall).toContain(modelB)
  })

  test('notifies once per store event regardless of other stores', () => {
    const notify = jest.fn()
    const storeA = makeMockStore({ table: 'a' })
    const storeB = makeMockStore({ table: 'b' })

    createLogoutWarningEffect(notify)(null as any, [storeA.store, storeB.store])

    storeA.push([{ id: '1' }])
    storeA.push([{ id: '1' }])
    storeB.push([{ id: '2' }])

    expect(notify).toHaveBeenCalledTimes(3)
  })
})

// ---

describe('teardown', () => {
  test('teardown unsubscribes all store subscriptions', () => {
    const notify = jest.fn()
    const { store, push } = makeMockStore()

    const teardown = createLogoutWarningEffect(notify)(null as any, [store])
    teardown()
    push([{ id: 'rec-1' }])

    expect(notify).not.toHaveBeenCalled()
  })

  test('teardown unsubscribes all stores', () => {
    const notify = jest.fn()
    const storeA = makeMockStore({ table: 'a' })
    const storeB = makeMockStore({ table: 'b' })

    const teardown = createLogoutWarningEffect(notify)(null as any, [storeA.store, storeB.store])
    teardown()

    storeA.push([{ id: '1' }])
    storeB.push([{ id: '2' }])

    expect(notify).not.toHaveBeenCalled()
  })
})
