import { Database } from '@nozbe/watermelondb'
import type { CompressionWorkerConstructor } from '../index'
import * as models from '../models'
import { compressInWorker } from './compression'
import { globalConfig } from '../../config.js'
import SyncContext from '../context'
import type SyncStore from '../store'
import { readPersistedTables } from './persisted-tables'
import { createEventBatcher, DiagnosticEvent } from './event-batcher'

export type DumpMode = 'off' | 'interval'
export type EventMode = 'off' | 'debounced_write' | 'interval'

export type IntrospectionModelConfig = {
  dumpMode: DumpMode
  dumpInterval: number
  eventMode: EventMode
}

export type IntrospectionConfig = Record<string, IntrospectionModelConfig>

export async function fetchConfig(): Promise<IntrospectionConfig> {
  return {
    ContentProgress: { dumpMode: 'interval', dumpInterval: 21600000, eventMode: 'debounced_write' },
    ContentLike: { dumpMode: 'interval', dumpInterval: 21600000, eventMode: 'debounced_write' },
    Practice: { dumpMode: 'interval', dumpInterval: 21600000, eventMode: 'debounced_write' },
  }
}

const LAST_DUMP_AT_KEY = 'introspection_last_dump_at'

async function getLastDumpAt(database: Database): Promise<number | null> {
  return (await database.localStorage.get<number | null>(LAST_DUMP_AT_KEY)) ?? null
}

async function setLastDumpAt(database: Database, timestamp: number): Promise<void> {
  await database.write(() => database.localStorage.set(LAST_DUMP_AT_KEY, timestamp))
}

function tableForModelName(modelName: string): string {
  return (models as Record<string, { table: string }>)[modelName].table
}

async function readTablesFromLiveCache(database: Database, modelNames: string[]): Promise<Record<string, unknown[]>> {
  const entries = await Promise.all(
    modelNames.map(async (modelName) => {
      const records = await database.collections.get(tableForModelName(modelName)).query().fetch()
      return [modelName, records.map((record) => record._raw)] as const
    })
  )
  return Object.fromEntries(entries)
}

function isLokiAdapter(adapter: any) {
  return adapter?._driver && 'loki' in adapter._driver
}

async function readTables(database: Database, modelNames: string[]): Promise<Record<string, unknown[]>> {
  if (!isLokiAdapter(database.adapter.underlyingAdapter)) {
    return readTablesFromLiveCache(database, modelNames)
  }

  const byTable = await readPersistedTables(database.adapter.dbName, modelNames.map(tableForModelName))
  return Object.fromEntries(modelNames.map((modelName) => [modelName, byTable[tableForModelName(modelName)]]))
}

async function uploadSnapshot(payload: string, context: SyncContext): Promise<void> {
  await fetch(`${globalConfig.baseUrl}/api/sync/v1/diagnostics/snapshot`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(globalConfig.sessionConfig?.token ? { Authorization: `Bearer ${globalConfig.sessionConfig.token}` } : {}),
    },
    body: JSON.stringify({
      client_id: context.session.getClientId(),
      client_session_id: context.session.getSessionId() ?? '',
      client_created_at: Date.now(),
      payload,
    }),
  })
}

async function performDump(database: Database, modelNames: string[], context: SyncContext, CompressionWorker?: CompressionWorkerConstructor) {
  const dataset = await readTables(database, modelNames)
  const payload = await compressInWorker(dataset, CompressionWorker)
  await uploadSnapshot(payload, context)
  await setLastDumpAt(database, Date.now())
  return payload
}

export async function triggerManualDump(database: Database, context: SyncContext, CompressionWorker?: CompressionWorkerConstructor) {
  const config = await fetchConfig()
  return performDump(database, Object.keys(config), context, CompressionWorker)
}

function diffRaw(current: Record<string, unknown>, previous: Record<string, unknown> | null): Record<string, [unknown, unknown]> {
  const keys = new Set([...Object.keys(current), ...Object.keys(previous ?? {})])
  const diff: Record<string, [unknown, unknown]> = {}

  keys.forEach((key) => {
    const previousValue = previous ? previous[key] : undefined
    const currentValue = current[key]
    if (previousValue !== currentValue) {
      diff[key] = [previousValue, currentValue]
    }
  })

  return diff
}

function buildDiagnosticEvents(
  tableName: string,
  op: 'upserted' | 'deleted' | 'restored',
  events: [unknown, unknown][],
  timestamp: number
): DiagnosticEvent[] {
  return op === 'deleted'
    ? (events as [string, Record<string, unknown> | null][]).map(([id, previous]) => ({
        model_name: tableName,
        record_id: id,
        op,
        changed_fields: diffRaw({}, previous),
        client_created_at: timestamp,
      }))
    : (events as [{ id: string; _raw: Record<string, unknown> }, Record<string, unknown> | null][]).map(
        ([record, previous]) => ({
          model_name: tableName,
          record_id: record.id,
          op,
          changed_fields: diffRaw(record._raw, previous),
          client_created_at: timestamp,
        })
      )
}

async function subscribeToWriteEvents(storesRegistry: Record<string, SyncStore<any>>, context: SyncContext) {
  const config = await fetchConfig()
  const activeModelNames = Object.entries(config)
    .filter(([, modelConfig]) => modelConfig.eventMode !== 'off')
    .map(([modelName]) => modelName)

  const batcher = createEventBatcher(context)

  const unsubscribes = activeModelNames.flatMap((modelName) => {
    const tableName = tableForModelName(modelName)
    const store = storesRegistry[tableName]
    if (!store) return []

    return [
      store.on('upserted', (records) => batcher.queue(buildDiagnosticEvents(tableName, 'upserted', records, Date.now()))),
      store.on('deleted', (ids) => batcher.queue(buildDiagnosticEvents(tableName, 'deleted', ids, Date.now()))),
      store.on('restored', (records) => batcher.queue(buildDiagnosticEvents(tableName, 'restored', records, Date.now()))),
    ]
  })

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe())
    batcher.flush()
  }
}

export default function setup(context: SyncContext, database: Database, storesRegistry: Record<string, SyncStore<any>>, CompressionWorker?: CompressionWorkerConstructor) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let unsubscribeWriteEvents: (() => void) | null = null

  subscribeToWriteEvents(storesRegistry, context).then((unsubscribe) => {
    unsubscribeWriteEvents = unsubscribe
  })

  async function scheduleNextDump() {
    const config = await fetchConfig()
    const dumpableModelNames = Object.entries(config)
      .filter(([, modelConfig]) => modelConfig.dumpMode === 'interval')
      .map(([modelName]) => modelName)
    if (!dumpableModelNames.length) return

    const minInterval = Math.min(...dumpableModelNames.map((modelName) => config[modelName].dumpInterval))
    const lastDumpAt = await getLastDumpAt(database)
    const delay = Math.max(0, (lastDumpAt ?? 0) + minInterval - Date.now())

    timer = setTimeout(async () => {
      await performDump(database, dumpableModelNames, context, CompressionWorker)
      scheduleNextDump()
    }, delay)
  }

  scheduleNextDump()

  return async () => {
    if (timer) clearTimeout(timer)
    unsubscribeWriteEvents?.()
  }
}
