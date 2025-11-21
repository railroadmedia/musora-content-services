import { SyncStoreConfig } from "./store"
import ContentLike from "./models/ContentLike"
import ContentProgress from "./models/ContentProgress"
import ContentPractice from "./models/ContentPractice"
import UserAwardProgress from "./models/UserAwardProgress"
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
    }),

    createStore({
      model: ContentPractice,
      pull: async () => {
        console.warn('[ContentPractice] Using mock data (25 minutes) - waiting for BE endpoint')
        const now = Math.floor(Date.now() / 1000)
        return {
          ok: true,
          token: now,
          previousToken: null,
          entries: [
            {
              record: {
                content_id: 416445,
                duration_seconds: 600,
                created_at: now - 86400,
                updated_at: now - 86400
              },
              meta: {
                ids: { id: 'mock-practice-1' },
                lifecycle: { created_at: now - 86400, updated_at: now - 86400 },
                deleted: false
              }
            },
            {
              record: {
                content_id: 417046,
                duration_seconds: 900,
                created_at: now - 43200,
                updated_at: now - 43200
              },
              meta: {
                ids: { id: 'mock-practice-2' },
                lifecycle: { created_at: now - 43200, updated_at: now - 43200 },
                deleted: false
              }
            }
          ]
        }
      },
      push: handlePush(makeFetchRequest('/api/content/v1/user/practices', { method: 'POST' })),
    }),

    createStore({
      model: UserAwardProgress,
      pull: handlePull(makeFetchRequest('/api/content/v1/user/awards')),
      push: handlePush(makeFetchRequest('/api/content/v1/user/awards', { method: 'POST' })),
    })
  ] as unknown as SyncStore<BaseModel>[]
}
