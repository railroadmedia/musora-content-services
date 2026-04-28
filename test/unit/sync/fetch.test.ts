import * as fflate from 'fflate'
import { handlePull, type SyncPullResponse } from '@/services/sync/fetch'
import { makeContext } from './helpers/index'
import type { EpochMs } from '@/services/sync/index'

// ---

const USER_ID = 1
const TOKEN = 1700000001000 as EpochMs
const TABLE = 'content_progress'

function gzipBase64(data: object): string {
  const bytes = fflate.strToU8(JSON.stringify(data))
  const compressed = fflate.gzipSync(bytes)
  let binary = ''
  compressed.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

function rawPullBody(overrides: object = {}) {
  return {
    meta: { since: null, max_updated_at: TOKEN, timestamp: TOKEN },
    entries: [],
    ...overrides,
  }
}

function mockResponse(body: string, headers: Record<string, string> = {}, status = 200) {
  return new Response(body, {
    status,
    headers: { 'X-Sync-Intended-User-Id': String(USER_ID), ...headers },
  })
}

function makePull() {
  return handlePull(() => new Request('https://api.example.com/sync'))
}

function callPull(pull: ReturnType<typeof handlePull>, lastFetchToken: any = null) {
  return pull(TABLE, 1, USER_ID, makeContext(), new AbortController().signal, lastFetchToken)
}

// ---

describe('plain JSON response', () => {
  test('parses entries from JSON body', async () => {
    const entry = { record: { id: 'rec-1' }, meta: { ids: { id: 'rec-1' }, lifecycle: { created_at: TOKEN, updated_at: TOKEN, deleted_at: null } } }
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify(rawPullBody({ entries: [entry] })))
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, entries: expect.arrayContaining([entry]) })
  })

  test('returns token from max_updated_at', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify(rawPullBody()))
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, token: TOKEN })
  })

  test('falls back to timestamp when max_updated_at is null', async () => {
    const timestamp = 1700000009999 as EpochMs
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify({ meta: { since: null, max_updated_at: null, timestamp }, entries: [] }))
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, token: timestamp })
  })
})

// ---

describe('gzip-base64 response', () => {
  test('decompresses and parses entries', async () => {
    const entry = { record: { id: 'gz-1' }, meta: { ids: { id: 'gz-1' }, lifecycle: { created_at: TOKEN, updated_at: TOKEN, deleted_at: null } } }
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(
        gzipBase64(rawPullBody({ entries: [entry] })),
        { 'X-Sync-Content-Encoding': 'gzip-base64' }
      )
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, entries: expect.arrayContaining([entry]) })
  })

  test('entry data survives compression round-trip', async () => {
    const entry = {
      record: { id: 'gz-2', value: 'hello', score: 42 },
      meta: { ids: { id: 'gz-2' }, lifecycle: { created_at: TOKEN, updated_at: TOKEN, deleted_at: null } },
    }
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(
        gzipBase64(rawPullBody({ entries: [entry] })),
        { 'X-Sync-Content-Encoding': 'gzip-base64' }
      )
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, entries: [{ record: { value: 'hello', score: 42 } }] })
  })

  test('returns correct token from compressed payload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(
        gzipBase64(rawPullBody()),
        { 'X-Sync-Content-Encoding': 'gzip-base64' }
      )
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, token: TOKEN })
  })

  test('large payload survives compression', async () => {
    const entries = Array.from({ length: 500 }, (_, i) => ({
      record: { id: `rec-${i}`, value: `value-${i}`.repeat(20) },
      meta: { ids: { id: `rec-${i}` }, lifecycle: { created_at: TOKEN, updated_at: TOKEN, deleted_at: null } },
    }))
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(
        gzipBase64(rawPullBody({ entries })),
        { 'X-Sync-Content-Encoding': 'gzip-base64' }
      )
    )

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: true, entries: expect.arrayContaining([expect.objectContaining({ record: expect.objectContaining({ id: 'rec-0' }) })]) })
    expect((result as Extract<SyncPullResponse, { ok: true }>).entries).toHaveLength(500)
  })
})

// ---

describe('since query param', () => {
  test('no since param on first pull', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify(rawPullBody()))
    )

    await callPull(makePull(), null)

    const url = (fetchSpy.mock.calls[0][0] as Request).url
    expect(new URL(url).searchParams.get('since')).toBeNull()
  })

  test('since param set to previous token on subsequent pull', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify(rawPullBody()))
    )

    await callPull(makePull(), TOKEN)

    const url = (fetchSpy.mock.calls[0][0] as Request).url
    expect(new URL(url).searchParams.get('since')).toBe(String(TOKEN))
  })
})

// ---

describe('request headers', () => {
  test('outgoing request includes gzip-base64 accept encoding header', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      mockResponse(JSON.stringify(rawPullBody()))
    )

    const pull = handlePull(() => new Request('https://api.example.com/sync', {
      headers: { 'X-Sync-Accept-Encoding': 'gzip-base64' }
    }))
    await callPull(pull)

    const req = fetchSpy.mock.calls[0][0] as Request
    expect(req.headers.get('X-Sync-Accept-Encoding')).toBe('gzip-base64')
  })
})

// ---

describe('failure responses', () => {
  test('network TypeError returns retryable fetch failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('network error'))

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: false, failureType: 'fetch', isRetryable: true })
  })

  test('AbortError returns abort failure', async () => {
    const abortError = new DOMException('aborted', 'AbortError')
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(abortError)

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: false, failureType: 'abort' })
  })

  test('5xx returns retryable fetch failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 500 }))

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: false, failureType: 'fetch', isRetryable: true })
  })

  test('4xx (non-retryable) returns non-retryable fetch failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 403 }))

    const result = await callPull(makePull())

    expect(result).toMatchObject({ ok: false, failureType: 'fetch', isRetryable: false })
  })
})
