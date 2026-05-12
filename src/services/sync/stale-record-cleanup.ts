import { Q } from '@nozbe/watermelondb'
import { POST } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import BaseModel from './models/Base'
import type { default as SyncStore } from './store'
import type { EpochMs } from './index'
import { SyncTelemetry } from './telemetry/index'

const CLEANUP_FLAG_KEY = 'stale_synced_cleanup_v1'
const STALE_CUTOFF_MS = 10_000
const SYNC_TABLES = ['progress', 'content_likes', 'practices', 'practice_day_notes', 'user_award_progress']

async function getCleanupFlag(): Promise<string | null> {
  return globalConfig.isMA
    ? globalConfig.localStorage.getItem(CLEANUP_FLAG_KEY)
    : Promise.resolve(globalConfig.localStorage.getItem(CLEANUP_FLAG_KEY))
}

async function setCleanupFlag(): Promise<void> {
  if (globalConfig.isMA) {
    await globalConfig.localStorage.setItem(CLEANUP_FLAG_KEY, '1')
  } else {
    globalConfig.localStorage.setItem(CLEANUP_FLAG_KEY, '1')
  }
}

export async function repairStaleSyncedRecords(storesRegistry: Record<string, SyncStore<any>>) {
  if (await getCleanupFlag()) return

  const cutoff = Date.now() - STALE_CUTOFF_MS
  const payload: Record<string, [id: string, updated_at: EpochMs][]> = {}
  const recordsByTable: Record<string, BaseModel[]> = {}

  for (const table of SYNC_TABLES) {
    const store = storesRegistry[table]
    if (!store) continue

    const records = (await store.db.read(() =>
      store.db.get(table).query(
        Q.where('_status', 'synced'),
        Q.where('updated_at', Q.lt(cutoff))
      ).fetch()
    )) as BaseModel[]

    if (records.length === 0) continue

    payload[table] = records.map((r) => [r._raw.id, r._raw.updated_at as EpochMs])
    recordsByTable[table] = records
  }

  if (Object.keys(payload).length === 0) return

  const staleEntries: Record<string, [id: string, serverUpdatedAt: number][]> = await POST('/api/sync/v1/stale-record-check', payload)

  const repairedByTable: Record<string, [id: string, localUpdatedAt: EpochMs, serverUpdatedAt: number][]> = {}
  const preparedUpdates = Object.entries(staleEntries).flatMap(([table, entries]) => {
    const records = recordsByTable[table] ?? []
    const serverTimestampById = new Map(entries.map(([id, serverTs]) => [id, serverTs]))
    return records
      .filter((r) => serverTimestampById.has(r._raw.id))
      .map((record) => {
        const savedUpdatedAt = record._raw.updated_at as EpochMs
        repairedByTable[table] ??= []
        repairedByTable[table].push([record._raw.id, savedUpdatedAt, serverTimestampById.get(record._raw.id)!])
        return record.prepareUpdate((r) => {
          r._raw._status = 'updated'
          r._raw.updated_at = savedUpdatedAt
        })
      })
  })

  if (preparedUpdates.length === 0) return

  const db = Object.values(storesRegistry)[0]!.db
  await db.write(async () => {
    await db.batch(...preparedUpdates)
  })

  SyncTelemetry.getInstance()?.info('[SyncManager] repaired stale synced records', { records: repairedByTable })
  await setCleanupFlag()
}
