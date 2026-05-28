import { SyncStoreConfig } from "./store"
import { ContentLike, ContentProgress, Practice, UserAwardProgress, PracticeDayNote } from "./models"
import { handlePull, handlePush, makeFetchRequest } from "./fetch"

import type BaseModel from "./models/Base"
import { EpochMs } from "./index"

const parseSessionMap = (v: unknown): Record<string, number> => {
  if (!v) return {}
  try { return typeof v === 'string' ? JSON.parse(v) : (v as Record<string, number>) } catch { return {} }
}

const mergeSessionMaps = (local: unknown, server: unknown): Record<string, number> => {
  const merged: Record<string, number> = { ...parseSessionMap(local) }
  for (const [key, value] of Object.entries(parseSessionMap(server))) {
    merged[key] = Math.max(merged[key] ?? 0, value)
  }
  return merged
}

// keeps type-safety in each entry
const c = <TModel extends BaseModel>(config: SyncStoreConfig<TModel>) => config

export default function createStoresFromConfig() {
  return [
    c({
      model: ContentLike,
      pull: handlePull(makeFetchRequest('/api/content/v1/user/likes')),
      push: handlePush(makeFetchRequest('/api/content/v1/user/likes', { method: 'POST' })),
    }),

    c({
      model: ContentProgress,
      comparator: (server, local) => {
        if (server.record.progress_percent === 0 || local.progress_percent === 0) {
          return server.meta.lifecycle.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
        } else {
          return server.record.progress_percent >= local.progress_percent ? 'SERVER' : 'LOCAL'
        }
      },
      pull: handlePull(makeFetchRequest('/content/user/progress')),
      push: handlePush(makeFetchRequest('/content/user/progress', { method: 'POST' })),
    }),

    c({
      model: Practice,
      pull: handlePull(makeFetchRequest('/api/user/practices/v1')),
      push: handlePush(makeFetchRequest('/api/user/practices/v1', { method: 'POST' })),
      purgeGracePeriod: 12_000 as EpochMs, // delete undo toast duration is 10s
      columnMergeStrategies: {
        session_duration_seconds: (localValue, serverValue) => mergeSessionMaps(localValue, serverValue),
        duration_seconds: (_localValue, _serverValue, localRecord, serverRecord) => {
          const override = localRecord.duration_seconds_override ?? serverRecord.duration_seconds_override ?? null
          if (override != null) return override
          const merged = mergeSessionMaps(localRecord.session_duration_seconds, serverRecord.session_duration_seconds)
          return Math.min(Object.values(merged).reduce((sum, v) => sum + v, 0), 59999)
        },
      },
    }),

    c({
      model: PracticeDayNote,
      pull: handlePull(makeFetchRequest('/api/user/practices/v1/notes')),
      push: handlePush(makeFetchRequest('/api/user/practices/v1/notes', { method: 'POST' })),
      purgeGracePeriod: 12_000 as EpochMs // delete undo toast duration is 10s
    }),

    c({
      model: UserAwardProgress,
      pull: handlePull(makeFetchRequest('/api/content/v1/user/awards')),
      push: handlePush(makeFetchRequest('/api/content/v1/user/awards', { method: 'POST' })),
    })
  ]
}
