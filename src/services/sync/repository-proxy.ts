import SyncManager from "./manager"
import { SyncError } from "./errors"

import { ContentLikesRepository, ContentProgressRepository } from "./repositories"
import { ContentLike, ContentProgress } from "./models"

interface SyncRepositories {
 likes: ContentLikesRepository
 contentProgress: ContentProgressRepository
}

export default new Proxy({} as SyncRepositories, {
  get(target: SyncRepositories, prop: keyof SyncRepositories) {
    if (!target[prop]) {
      const manager = SyncManager.getInstance()

      switch (prop) {
        case 'likes':
          target[prop] = new ContentLikesRepository(manager.getStore(ContentLike))
          break
        case 'contentProgress':
          target[prop] = new ContentProgressRepository(manager.getStore(ContentProgress))
          break
        default:
          throw new SyncError(`Repository '${prop}' not found`)
      }
    }
    return target[prop]
  }
})
