import SyncManager from "./manager"
import { SyncError } from "./errors"

import { ContentLikesRepository, ContentProgressRepository } from "./repositories"
import ContentPracticeRepository from "./repositories/content-practice"
import UserAwardProgressRepository from "./repositories/user-award-progress"
import { ContentLike, ContentProgress, ContentPractice, UserAwardProgress } from "./models"

interface SyncRepositories {
 likes: ContentLikesRepository
 contentProgress: ContentProgressRepository
 contentPractices: ContentPracticeRepository
 userAwardProgress: UserAwardProgressRepository
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
        case 'contentPractices':
          target[prop] = new ContentPracticeRepository(manager.getStore(ContentPractice))
          break
        case 'userAwardProgress':
          target[prop] = new UserAwardProgressRepository(manager.getStore(UserAwardProgress))
          break
        default:
          throw new SyncError(`Repository '${prop}' not found`)
      }
    }
    return target[prop]
  }
})
