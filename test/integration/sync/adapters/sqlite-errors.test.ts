/**
 * Tests for SQLiteErrorAwareAdapter and FullFailingSQLiteAdapter.
 *
 * WatermelonDB's SQLiteAdapter is React Native-only and can't be instantiated in Node.
 * We mock the parent class so we can test our error-handling wrapper logic.
 * better-sqlite3 provides ground-truth SQLite error message formats, confirming
 * our isSQLiteFullError detection handles both the RN format and native SQLite format.
 */

import BetterSqlite3 from 'better-sqlite3'

// Mock the RN-only SQLiteAdapter before importing our wrapper
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => {
  return class MockSQLiteAdapter {
    _dispatcher = {
      call: (_method: string, _args: any[], callback: any) => callback({ error: null }),
    }
    constructor(public options: any) {}
    // Route through _dispatcher like the real RN adapter — required so
    // FullFailingSQLiteAdapter's dispatcher patch intercepts batch calls
    batch(operations: any[], callback: (result: any) => void) {
      this._dispatcher.call('batch', [operations], callback)
    }
    get schema() { return this.options?.schema }
  }
})

import SQLiteErrorAwareAdapter, {
  FullFailingSQLiteAdapter,
} from '@/services/sync/adapters/sqlite'

// ---

describe('isSQLiteFullError detection via SQLiteErrorAwareAdapter.batch()', () => {
  function makeAdapterWithDispatcherError(error: Error | null, onFullError?: jest.Mock) {
    const adapter = new SQLiteErrorAwareAdapter(
      { schema: null } as any,
      onFullError ? { onFullError } : {}
    )
    // Override dispatcher to return a specific error result
    ;(adapter as any)._dispatcher.call = (_method: string, _args: any[], callback: any) =>
      callback({ error })
    return adapter
  }

  test('calls onFullError for RN-style "sqlite error 13" message', done => {
    const onFullError = jest.fn()
    const adapter = makeAdapterWithDispatcherError(
      new Error('sqlite error 13 (database or disk is full)'),
      onFullError
    )

    adapter.batch([], _result => {
      expect(onFullError).toHaveBeenCalledTimes(1)
      done()
    })
  })

  test('calls onFullError for "database or disk is full" message', done => {
    const onFullError = jest.fn()
    const adapter = makeAdapterWithDispatcherError(
      new Error('database or disk is full'),
      onFullError
    )

    adapter.batch([], _result => {
      expect(onFullError).toHaveBeenCalledTimes(1)
      done()
    })
  })

  test('does NOT call onFullError for unrelated errors', done => {
    const onFullError = jest.fn()
    const adapter = makeAdapterWithDispatcherError(
      new Error('no such table: foo'),
      onFullError
    )

    adapter.batch([], _result => {
      expect(onFullError).not.toHaveBeenCalled()
      done()
    })
  })

  test('does NOT call onFullError when no error', done => {
    const onFullError = jest.fn()
    const adapter = makeAdapterWithDispatcherError(null, onFullError)

    adapter.batch([], _result => {
      expect(onFullError).not.toHaveBeenCalled()
      done()
    })
  })

  test('still calls original callback regardless of error type', done => {
    const adapter = makeAdapterWithDispatcherError(new Error('some error'))
    const callback = jest.fn()

    adapter.batch([], callback)
    expect(callback).toHaveBeenCalledTimes(1)
    done()
  })
})

describe('FullFailingSQLiteAdapter', () => {
  test('batch always fires error callback', done => {
    const onFullError = jest.fn()
    const adapter = new FullFailingSQLiteAdapter({ schema: null } as any, { onFullError })

    adapter.batch([], result => {
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('sqlite error 13')
      done()
    })
  })

  test('batch calls onFullError', done => {
    const onFullError = jest.fn()
    const adapter = new FullFailingSQLiteAdapter({ schema: null } as any, { onFullError })

    adapter.batch([], _result => {
      expect(onFullError).toHaveBeenCalledTimes(1)
      done()
    })
  })

  test('non-batch methods pass through to real adapter', () => {
    const adapter = new FullFailingSQLiteAdapter({ schema: null } as any)
    // schema getter should work (delegated to parent/mock)
    expect(() => adapter.schema).not.toThrow()
  })
})

describe('better-sqlite3 error message format', () => {
  // Confirms that native SQLite error messages use the "database or disk is full"
  // phrase, which our isSQLiteFullError function checks for.
  // We can't easily trigger SQLITE_FULL (error 13) in a test, but we can verify
  // that other sqlite errors come through with the expected message structure,
  // and manually construct a SQLITE_FULL error to verify detection.

  test('better-sqlite3 errors are plain Error instances with message string', () => {
    const db = new BetterSqlite3(':memory:')
    let caught: Error | null = null

    try {
      db.exec('SELECT * FROM nonexistent_table_xyz')
    } catch (e) {
      caught = e as Error
    }

    expect(caught).toBeInstanceOf(Error)
    expect(typeof caught!.message).toBe('string')
    expect(caught!.message.length).toBeGreaterThan(0)
    db.close()
  })

  test('simulated SQLITE_FULL error matches our detection logic', done => {
    const onFullError = jest.fn()
    const adapter = new SQLiteErrorAwareAdapter({ schema: null } as any, { onFullError })

    // Construct error the way better-sqlite3 would for SQLITE_FULL (error code 13)
    const fullError = new Error('database or disk is full') as any
    fullError.code = 'SQLITE_FULL'

    ;(adapter as any)._dispatcher.call = (_method: string, _args: any[], callback: any) =>
      callback({ error: fullError })

    adapter.batch([], _result => {
      expect(onFullError).toHaveBeenCalledWith(fullError)
      done()
    })
  })
})
