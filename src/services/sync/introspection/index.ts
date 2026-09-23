import { Database } from '@nozbe/watermelondb'
import type { CompressionWorkerConstructor } from '../index'
import * as models from '../models'
import { compressInWorker } from './compression'
import SyncContext from '../context'
import type SyncStore from '../store'
import { readPersistedTables } from './persisted-tables'
import { clearEventQueue, createEventBatcher, DiagnosticEvent, drainEventQueue } from './event-batcher'
import { diagnosticsFetch } from './diagnostics-fetch'
import { reportCursors } from './cursors'
import { createUploadQueue } from './upload-queue'
import { SyncTelemetry } from '../telemetry/index'

export type DumpMode = 'off' | 'interval'
export type EventMode = 'off' | 'debounced_write' | 'interval'

export type IntrospectionModelConfig = {
  dump_mode: DumpMode
  dump_interval_minutes: number | null
  event_mode: EventMode
  cursor_enabled: boolean
}

export type IntrospectionConfig = Record<string, IntrospectionModelConfig>

let configPromise: Promise<IntrospectionConfig | null> | null = null

function isKnownModelName(modelName: string): boolean {
  return Object.prototype.hasOwnProperty.call(models, modelName)
}

function withKnownModelsOnly(config: IntrospectionConfig): IntrospectionConfig {
  return Object.fromEntries(Object.entries(config).filter(([modelName]) => isKnownModelName(modelName)))
}

export async function fetchConfig(): Promise<IntrospectionConfig | null> {
  if (!configPromise) {
    configPromise = diagnosticsFetch('/settings')
      .then((response) => (response.ok ? (response.json() as Promise<IntrospectionConfig>) : null))
      .then((config) => (config ? withKnownModelsOnly(config) : null))
      .catch(() => null)
  }

  const config = await configPromise
  if (!config) configPromise = null

  return config
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
      const tableName = tableForModelName(modelName)
      const collection = database.collections.get(tableName)
      const records = collection ? await collection.query().fetch() : []
      return [tableName, records.map((record) => record._raw)] as const
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
  return Object.fromEntries(modelNames.map((modelName) => [tableForModelName(modelName), byTable[tableForModelName(modelName)]]))
}

type SnapshotEntry = {
  client_id: string
  client_session_id: string
  client_created_at: number
  payload: string
}

const snapshotQueue = createUploadQueue<SnapshotEntry>('/snapshot')

async function performDump(
  database: Database,
  modelNames: string[],
  context: SyncContext,
  CompressionWorker?: CompressionWorkerConstructor,
  isCancelled: () => boolean = () => false
) {
  const dataset = await readTables(database, modelNames)
  const payload = await compressInWorker(dataset, CompressionWorker)
  if (isCancelled()) return

  snapshotQueue.enqueue(
    {
      client_id: context.session.getClientId(),
      client_session_id: context.session.getSessionId() ?? '',
      client_created_at: Date.now(),
      payload,
    },
    context
  )
  await setLastDumpAt(database, Date.now())

  return payload
}

export async function triggerManualDump(
  database: Database,
  context: SyncContext,
  CompressionWorker?: CompressionWorkerConstructor,
  isCancelled: () => boolean = () => false
) {
  const config = await fetchConfig()
  if (!config || isCancelled()) return

  return performDump(database, Object.keys(config), context, CompressionWorker, isCancelled)
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

type RawRecord = Record<string, unknown>

function buildWriteEvents(
  tableName: string,
  op: 'upserted' | 'restored',
  records: { id: string; _raw: RawRecord }[],
  previous: (RawRecord | null)[]
): DiagnosticEvent[] {
  const timestamp = Date.now()
  return records.map((record, index) => ({
    model_name: tableName,
    record_id: record.id,
    op,
    changed_fields: diffRaw(record._raw, previous[index] ?? null),
    client_created_at: timestamp,
  }))
}

function buildDeleteEvents(tableName: string, ids: string[], previous: (RawRecord | null)[]): DiagnosticEvent[] {
  const timestamp = Date.now()
  return ids.map((id, index) => ({
    model_name: tableName,
    record_id: id,
    op: 'deleted',
    changed_fields: diffRaw({}, previous[index] ?? null),
    client_created_at: timestamp,
  }))
}

async function subscribeToWriteEvents(storesRegistry: Record<string, SyncStore<any>>, context: SyncContext) {
  const config = await fetchConfig()
  if (!config) return () => {}

  const activeModelNames = Object.entries(config)
    .filter(([, modelConfig]) => modelConfig.event_mode !== 'off')
    .map(([modelName]) => modelName)

  const batcher = createEventBatcher(context)

  const unsubscribes = activeModelNames.flatMap((modelName) => {
    const tableName = tableForModelName(modelName)
    const store = storesRegistry[tableName]
    if (!store) return []

    return [
      store.on('upserted', (records, previous) => batcher.queue(buildWriteEvents(tableName, 'upserted', records, previous))),
      store.on('deleted', (ids, previous) => batcher.queue(buildDeleteEvents(tableName, ids, previous))),
      store.on('restored', (records, previous) => batcher.queue(buildWriteEvents(tableName, 'restored', records, previous))),
    ]
  })

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe())
    batcher.flush()
  }
}

async function startCursorReporting(storesRegistry: Record<string, SyncStore<any>>, context: SyncContext) {
  const config = await fetchConfig()
  if (!config) return () => {}

  const enabledStores = Object.fromEntries(
    Object.entries(config)
      .filter(([, modelConfig]) => modelConfig.cursor_enabled)
      .map(([modelName]) => tableForModelName(modelName))
      .filter((tableName) => storesRegistry[tableName])
      .map((tableName) => [tableName, storesRegistry[tableName]])
  )
  if (!Object.keys(enabledStores).length) return () => {}

  return reportCursors(context, enabledStores)
}

export default function setup(context: SyncContext, database: Database, storesRegistry: Record<string, SyncStore<any>>, CompressionWorker?: CompressionWorkerConstructor) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let unsubscribeWriteEvents: (() => void) | null = null
  let unsubscribeVisibilityWait: (() => void) | null = null
  let stopReportingCursors: (() => void) | null = null
  let isTornDown = false
  let hasStarted = false
  let lastDumpAttemptAt = 0

  async function start() {
    if (hasStarted || isTornDown) return
    const config = await fetchConfig()
    if (!config || hasStarted || isTornDown) return
    hasStarted = true

    startCursorReporting(storesRegistry, context).then((stop) => {
      if (isTornDown) return stop()
      stopReportingCursors = stop
    })

    subscribeToWriteEvents(storesRegistry, context).then((unsubscribe) => {
      if (isTornDown) return unsubscribe()
      unsubscribeWriteEvents = unsubscribe
    })

    scheduleNextDump()
  }

  const unsubscribeConnectivity = context.connectivity.subscribe((isOnline) => {
    if (!isOnline) return
    start()
    snapshotQueue.drain(context)
    drainEventQueue(context)
  })

  function waitUntilVisible(onVisible: () => void) {
    unsubscribeVisibilityWait = context.visibility.subscribe((isVisible) => {
      if (!isVisible) return
      unsubscribeVisibilityWait?.()
      unsubscribeVisibilityWait = null
      onVisible()
    })
  }

  async function scheduleNextDump() {
    const config = await fetchConfig()
    if (!config) return

    const dumpableModelNames = Object.entries(config)
      .filter(([, modelConfig]) => modelConfig.dump_mode === 'interval')
      .map(([modelName]) => modelName)
    if (!dumpableModelNames.length) return

    const minIntervalMinutes = Math.max(0, Math.min(...dumpableModelNames.map((modelName) => config[modelName].dump_interval_minutes ?? 0)) || 1440)
    const lastDumpAt = await getLastDumpAt(database)
    const delay = Math.max(0, Math.max(lastDumpAt ?? 0, lastDumpAttemptAt) + (minIntervalMinutes * 60 * 1000) - Date.now())
    if (isTornDown) return

    timer = setTimeout(async () => {
      if (!context.visibility.getValue()) {
        waitUntilVisible(scheduleNextDump)
        return
      }

      lastDumpAttemptAt = Date.now()
      try {
        await performDump(database, dumpableModelNames, context, CompressionWorker, () => isTornDown)
      } catch (error) {
        SyncTelemetry.getInstance()?.capture(error)
      }
      if (!isTornDown) scheduleNextDump()
    }, delay)
  }

  start()

  return async () => {
    isTornDown = true
    if (timer) clearTimeout(timer)
    stopReportingCursors?.()
    unsubscribeVisibilityWait?.()
    unsubscribeConnectivity()
    unsubscribeWriteEvents?.()
    snapshotQueue.clear()
    clearEventQueue()
  }
}
