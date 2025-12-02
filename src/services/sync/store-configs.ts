import { SyncStoreConfig } from "./store"
import { ContentLike, ContentProgress, Practice, PracticeDayNote } from "./models"
import { handlePull, handlePush, makeFetchRequest } from "./fetch"

import type SyncStore from "./store"
import type BaseModel from "./models/Base"

export default function createStoresFromConfig(createStore: <TModel extends BaseModel>(config: SyncStoreConfig<TModel>) => SyncStore<TModel>) {
  return [
    createStore({
      model: ContentLike,
      pull: handlePull(makeFetchRequest('/api/content/v1/user/likes')),
      push: handlePush(makeFetchRequest('/api/content/v1/user/likes', { method: 'POST' })),
    }),

    createStore({
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

    createStore({
      model: Practice,
      pull: handlePull(makeFetchRequest('/api/user/practices/v1')),
      push: handlePush(makeFetchRequest('/api/user/practices/v1', { method: 'POST' })),
    }),

    createStore({
      model: PracticeDayNote,
      pull: handlePull(makeFetchRequest('/api/user/practices/v1/notes')),
      push: handlePush(makeFetchRequest('/api/user/practices/v1/notes', { method: 'POST' })),
    })
  ] as unknown as SyncStore<BaseModel>[]
}
