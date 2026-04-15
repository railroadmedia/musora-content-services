jest.mock('../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../src/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../helpers/index'
import ContentLike from '../../../src/services/sync/models/ContentLike'
import LikesRepository from '../../../src/services/sync/repositories/content-likes'

let db: Database
let repo: LikesRepository

beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(ContentLike, db)
  repo = new LikesRepository(store)
})

afterEach(async () => {
  await resetDatabase(db)
})

// ---

describe('like / unlike', () => {
  test('like creates a record for the contentId', async () => {
    await repo.like(100)

    const result = await repo['store'].readOne(ContentLike.generateId(100))
    expect(result).not.toBeNull()
    expect(result!.content_id).toBe(100)
  })

  test('unlike removes the record', async () => {
    await repo.like(200)
    await repo.unlike(200)

    const result = await repo['store'].readOne(ContentLike.generateId(200))
    expect(result).toBeNull()
  })

  test('liking same content twice is idempotent', async () => {
    await repo.like(300)
    await repo.like(300)

    const all = await repo['store'].readAll()
    expect(all).toHaveLength(1)
  })
})

describe('isLiked', () => {
  test('returns true when content is liked', async () => {
    await repo.like(400)

    const result = await repo.isLiked(400)
    expect(result.data).toBe(true)
  })

  test('returns false when content is not liked', async () => {
    const result = await repo.isLiked(9999)
    expect(result.data).toBe(false)
  })

  test('returns false after unliking', async () => {
    await repo.like(500)
    await repo.unlike(500)

    const result = await repo.isLiked(500)
    expect(result.data).toBe(false)
  })
})

describe('areLiked', () => {
  test('returns boolean array in same order as input', async () => {
    await repo.like(600)
    await repo.like(602)
    // 601 not liked

    const result = await repo.areLiked([600, 601, 602])
    expect(result.data).toEqual([true, false, true])
  })

  test('returns all false when nothing liked', async () => {
    const result = await repo.areLiked([1, 2, 3])
    expect(result.data).toEqual([false, false, false])
  })

  test('returns all true when all liked', async () => {
    await repo.like(700)
    await repo.like(701)

    const result = await repo.areLiked([700, 701])
    expect(result.data).toEqual([true, true])
  })

  test('empty array returns empty array', async () => {
    const result = await repo.areLiked([])
    expect(result.data).toEqual([])
  })
})
