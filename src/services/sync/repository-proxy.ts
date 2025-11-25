import SyncManager from "./manager"
import { SyncError } from "./errors"

import {
  ContentLikesRepository,
  ContentProgressRepository,
  PracticesRepository,
  PracticeDayNotesRepository
} from "./repositories"
import {
  ContentLike,
  ContentProgress,
  Practice,
  PracticeDayNote
} from "./models"

interface SyncRepositories {
 likes: ContentLikesRepository
 contentProgress: ContentProgressRepository
 practices: PracticesRepository
 practiceDayNotes: PracticeDayNotesRepository
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
        case 'practiceDayNotes':
          target[prop] = new PracticeDayNotesRepository(manager.getStore(PracticeDayNote))
          break
        default:
          throw new SyncError(`Repository '${prop}' not found`)
      }
    }
    return target[prop]
  }
})
