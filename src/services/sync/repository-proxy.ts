import SyncManager from "./manager"
import { SyncError } from "./errors"

import {
  ContentLikesRepository,
  ContentProgressRepository,
  PracticesRepository
} from "./repositories"
import {
  ContentLike,
  ContentProgress,
  Practice
} from "./models"

interface SyncRepositories {
 likes: ContentLikesRepository
 contentProgress: ContentProgressRepository
 practices: PracticesRepository
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
        case 'practices':
            target[prop] = new PracticesRepository(manager.getStore(Practice))
          break
        default:
          throw new SyncError(`Repository '${prop}' not found`)
      }
    }
    return target[prop]
  }
})
