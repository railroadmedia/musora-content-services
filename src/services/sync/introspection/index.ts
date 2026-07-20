import { Database } from '@nozbe/watermelondb'
import type { CompressionWorkerConstructor } from '../index'
import * as models from '../models'
import { compressInWorker } from './compression'
import { globalConfig } from '../../config.js'
import SyncContext from '../context'

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

async function readTables(database: Database, modelNames: string[]): Promise<Record<string, unknown[]>> {
  const entries = await Promise.all(
    modelNames.map(async (modelName) => {
      const records = await database.collections.get(tableForModelName(modelName)).query().fetch()
      return [modelName, records.map((record) => record._raw)] as const
    })
  )
  return Object.fromEntries(entries)
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

export default function setup(context: SyncContext, database: Database, CompressionWorker?: CompressionWorkerConstructor) {
  let timer: ReturnType<typeof setTimeout> | null = null

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
  }
}
