import SyncManager from "./manager"
import { SyncError } from "./errors"

import {
  ContentLikesRepository,
  ContentProgressRepository,
  PracticesRepository,
  PracticeDayNotesRepository
} from "./repositories"
import UserAwardProgressRepository from "./repositories/user-award-progress"
import {
  ContentLike,
  ContentProgress,
  Practice,
  UserAwardProgress,
  PracticeDayNote
} from "./models"

interface SyncRepositories {
 likes: ContentLikesRepository
 contentProgress: ContentProgressRepository
 practices: PracticesRepository
 userAwardProgress: UserAwardProgressRepository
 practiceDayNotes: PracticeDayNotesRepository
}

export default new Proxy({} as SyncRepositories, {
  get(target: SyncRepositories, prop: keyof SyncRepositories) {
    if (!target[prop]) {
      try {
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
          case 'userAwardProgress':
            target[prop] = new UserAwardProgressRepository(manager.getStore(UserAwardProgress))
            break
          case 'practiceDayNotes':
            target[prop] = new PracticeDayNotesRepository(manager.getStore(PracticeDayNote))
            break
          default:
            throw new SyncError(`Repository '${prop}' not found`)
        }
      } catch (error) {
        throw new SyncError(`Failed to initialize repository '${prop}': ${error.message}`)
      }
    }
    return target[prop]
  }
})
