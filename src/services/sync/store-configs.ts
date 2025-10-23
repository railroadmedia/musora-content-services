import { SyncStoreConfig } from "./store"
import ContentLike from "./models/ContentLike"
import ContentProgress from "./models/ContentProgress"
import { handlePull, handlePush, makeFetchRequest } from "./fetch"
import SyncStore from "./store"
import BaseModel from "./models/Base"

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
    })
  ] as unknown as SyncStore<BaseModel>[]
}
