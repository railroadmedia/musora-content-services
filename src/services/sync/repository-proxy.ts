import SyncManager from "./manager"
import { SyncError } from "./errors"

import {
  ContentLikesRepository,
  ContentProgressRepository,
  PracticesRepository,
  PracticeDayNotesRepository,
  UserActivitiesRepository
} from "./repositories"
import UserAwardProgressRepository from "./repositories/user-award-progress"
import {
  ContentLike,
  ContentProgress,
  Practice,
  UserAwardProgress,
  PracticeDayNote,
  UserActivity
} from "./models"


interface SyncRepositories {
  likes: ContentLikesRepository;
  contentProgress: ContentProgressRepository;
  practices: PracticesRepository;
  userAwardProgress: UserAwardProgressRepository;
  practiceDayNotes: PracticeDayNotesRepository;
  userActivities: UserActivitiesRepository;
}


// internal cache for repositories, keyed by managerId and property name
const repoCache: Record<string, Partial<SyncRepositories>> = {};

const proxy = new Proxy({} as SyncRepositories, {
  get(_target, prop: keyof SyncRepositories) {
    // @ts-ignore - funny stuff in RN dev env that calls manager instance too early?
    if (prop === '$$typeof') return

    const manager = SyncManager.getInstance();
    const managerId = manager.getId();

    if (!repoCache[managerId]) {
      repoCache[managerId] = {};
    }
    const cache = repoCache[managerId];

    if (!cache[prop]) {
      switch (prop) {
        case 'likes':
          cache.likes = new ContentLikesRepository(manager.getStore(ContentLike));
          break;
        case 'contentProgress':
          cache.contentProgress = new ContentProgressRepository(manager.getStore(ContentProgress));
          break;
        case 'practices':
          cache.practices = new PracticesRepository(manager.getStore(Practice));
          break;
        case 'userAwardProgress':
          cache.userAwardProgress = new UserAwardProgressRepository(manager.getStore(UserAwardProgress));
          break;
        case 'practiceDayNotes':
          cache.practiceDayNotes = new PracticeDayNotesRepository(manager.getStore(PracticeDayNote));
          break;
        case 'userActivities':
          cache.userActivities = new UserActivitiesRepository(manager.getStore(UserActivity));
          break;
        default:
          throw new SyncError(`Repository '${String(prop)}' not found`);
      }
    }
    return cache[prop];
  }
});

export default proxy;


