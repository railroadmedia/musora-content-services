import SyncResolver, { updatedAtComparator } from '@/services/sync/resolver'
import type { SyncEntry, SyncEntryNonDeleted, EpochMs } from '@/services/sync/index'
import type BaseModel from '@/services/sync/models/Base'

// ---

const T = 1700000000000

function makeEntry(id: string, overrides: { updatedAt?: number; deletedAt?: number | null } = {}): SyncEntry {
  const updatedAt = overrides.updatedAt ?? T
  const deletedAt = overrides.deletedAt !== undefined ? overrides.deletedAt : null
  return {
    record: deletedAt ? null : ({ id } as unknown as BaseModel),
    meta: {
      ids: { id },
      lifecycle: {
        created_at: updatedAt as EpochMs,
        updated_at: updatedAt as EpochMs,
        deleted_at: deletedAt as EpochMs | null,
      },
    },
  }
}

function makeLocal(id: string, updatedAt = T): BaseModel {
  return { id, updated_at: updatedAt } as unknown as BaseModel
}

// ---

describe('updatedAtComparator', () => {
  test('returns SERVER when server updated_at is greater than local', () => {
    const server = makeEntry('x', { updatedAt: T + 1 })
    const local = makeLocal('x', T)
    expect(updatedAtComparator(server as unknown as SyncEntryNonDeleted, local)).toBe('SERVER')
  })

  test('returns SERVER when timestamps are equal', () => {
    const server = makeEntry('x', { updatedAt: T })
    const local = makeLocal('x', T)
    expect(updatedAtComparator(server as unknown as SyncEntryNonDeleted, local)).toBe('SERVER')
  })

  test('returns LOCAL when local updated_at is greater than server', () => {
    const server = makeEntry('x', { updatedAt: T - 1 })
    const local = makeLocal('x', T)
    expect(updatedAtComparator(server as unknown as SyncEntryNonDeleted, local)).toBe('LOCAL')
  })
})

// ---

describe('againstNone', () => {
  test('non-deleted entry queued for create', () => {
    const resolver = new SyncResolver()
    const entry = makeEntry('rec-1')

    resolver.againstNone(entry)

    expect(resolver.result.entriesForCreate).toHaveLength(1)
    expect(resolver.result.entriesForCreate[0]).toBe(entry)
  })

  test('deleted entry ignored', () => {
    const resolver = new SyncResolver()
    resolver.againstNone(makeEntry('rec-1', { deletedAt: T }))

    const { entriesForCreate, tuplesForUpdate, idsForDestroy, recordsForSynced } = resolver.result
    expect(entriesForCreate).toHaveLength(0)
    expect(tuplesForUpdate).toHaveLength(0)
    expect(idsForDestroy).toHaveLength(0)
    expect(recordsForSynced).toHaveLength(0)
  })
})

// ---

describe('againstSynced', () => {
  test('server deleted → idsForDestroy', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T)

    resolver.againstSynced(local, makeEntry('rec-1', { deletedAt: T }))

    expect(resolver.result.idsForDestroy).toContain('rec-1')
  })

  test('server newer → tuplesForUpdate', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T)
    const server = makeEntry('rec-1', { updatedAt: T + 1 })

    resolver.againstSynced(local, server)

    expect(resolver.result.tuplesForUpdate).toHaveLength(1)
    expect(resolver.result.tuplesForUpdate[0][0]).toBe(local)
    expect(resolver.result.tuplesForUpdate[0][1]).toBe(server)
  })

  test('server older → no action (stale pull ignored)', () => {
    const resolver = new SyncResolver()
    resolver.againstSynced(makeLocal('rec-1', T + 1), makeEntry('rec-1', { updatedAt: T }))

    const { tuplesForUpdate, idsForDestroy, recordsForSynced } = resolver.result
    expect(tuplesForUpdate).toHaveLength(0)
    expect(idsForDestroy).toHaveLength(0)
    expect(recordsForSynced).toHaveLength(0)
  })
})

// ---

describe('againstCreated', () => {
  test('server deleted → idsForDestroy (local changes discarded)', () => {
    const resolver = new SyncResolver()
    resolver.againstCreated(makeLocal('rec-1', T + 1), makeEntry('rec-1', { deletedAt: T }))

    expect(resolver.result.idsForDestroy).toContain('rec-1')
  })

  test('server newer → tuplesForUpdate', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T)
    const server = makeEntry('rec-1', { updatedAt: T + 1 })

    resolver.againstCreated(local, server)

    expect(resolver.result.tuplesForUpdate).toHaveLength(1)
    expect(resolver.result.tuplesForUpdate[0][1]).toBe(server)
  })

  test('server older (clock skew) → recordsForSynced', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T + 1)

    resolver.againstCreated(local, makeEntry('rec-1', { updatedAt: T }))

    expect(resolver.result.recordsForSynced).toContain(local)
    expect(resolver.result.tuplesForUpdate).toHaveLength(0)
  })
})

// ---

describe('againstUpdated', () => {
  test('server deleted → idsForDestroy (local changes discarded)', () => {
    const resolver = new SyncResolver()
    resolver.againstUpdated(makeLocal('rec-1', T + 1), makeEntry('rec-1', { deletedAt: T }))

    expect(resolver.result.idsForDestroy).toContain('rec-1')
  })

  test('server newer → tuplesForUpdate', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T)
    const server = makeEntry('rec-1', { updatedAt: T + 1 })

    resolver.againstUpdated(local, server)

    expect(resolver.result.tuplesForUpdate).toHaveLength(1)
  })

  test('server older (clock skew) → recordsForSynced', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T + 1)

    resolver.againstUpdated(local, makeEntry('rec-1', { updatedAt: T }))

    expect(resolver.result.recordsForSynced).toContain(local)
    expect(resolver.result.tuplesForUpdate).toHaveLength(0)
  })
})

// ---

describe('againstDeleted', () => {
  test('server also deleted → idsForDestroy', () => {
    const resolver = new SyncResolver()
    resolver.againstDeleted(makeLocal('rec-1', T), makeEntry('rec-1', { deletedAt: T }))

    expect(resolver.result.idsForDestroy).toContain('rec-1')
  })

  test('server updated_at >= local → tuplesForRestore', () => {
    const resolver = new SyncResolver()
    const local = makeLocal('rec-1', T)
    const server = makeEntry('rec-1', { updatedAt: T })

    resolver.againstDeleted(local, server)

    expect(resolver.result.tuplesForRestore).toHaveLength(1)
    expect(resolver.result.tuplesForRestore[0][0]).toBe(local)
    expect(resolver.result.tuplesForRestore[0][1]).toBe(server)
  })

  test('server older than local deleted_at → idsForDestroy (delete wins)', () => {
    const resolver = new SyncResolver()
    resolver.againstDeleted(makeLocal('rec-1', T + 1), makeEntry('rec-1', { updatedAt: T }))

    expect(resolver.result.idsForDestroy).toContain('rec-1')
    expect(resolver.result.tuplesForRestore).toHaveLength(0)
  })
})

// ---

describe('custom comparator', () => {
  test('custom comparator overrides default updated_at logic', () => {
    const alwaysLocal = () => 'LOCAL' as const
    const resolver = new SyncResolver(alwaysLocal)
    const local = makeLocal('rec-1', T)
    const server = makeEntry('rec-1', { updatedAt: T + 9999 })

    resolver.againstSynced(local, server)

    expect(resolver.result.tuplesForUpdate).toHaveLength(0)
    expect(resolver.result.recordsForSynced).toHaveLength(0)
    expect(resolver.result.idsForDestroy).toHaveLength(0)
  })

  test('custom comparator SERVER wins over newer local', () => {
    const alwaysServer = () => 'SERVER' as const
    const resolver = new SyncResolver(alwaysServer)
    const local = makeLocal('rec-1', T + 9999)
    const server = makeEntry('rec-1', { updatedAt: T })

    resolver.againstSynced(local, server)

    expect(resolver.result.tuplesForUpdate).toHaveLength(1)
  })
})

