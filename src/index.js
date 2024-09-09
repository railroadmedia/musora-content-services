import { initializeService } from './services/config.js';

import {
  fetchSongById,
  fetchArtists,
  fetchSongArtistCount,
  fetchRelatedSongs,
  fetchAllSongs,
  fetchSongFilterOptions,
  fetchSongCount,
  fetchWorkouts,
  fetchNewReleases,
  fetchUpcomingEvents,
  fetchByRailContentId,
  fetchByRailContentIds,
  fetchAll,
  fetchAllFilterOptions,
  fetchMethodNextLesson,
  fetchFoundation,
  fetchMethod,
  fetchMethods,
  fetchMethodChildren,
  fetchMethodChildrenIds,
  fetchNextPreviousLesson,
  fetchRelatedLessons,
  fetchAllPacks,
  fetchPackAll,
  fetchPackChildren,
  fetchLessonContent,
  fetchCourseOverview,
  fetchChildren,
  fetchParentByRailContentId,
  fetchMethodPreviousNextLesson,
  fetchLiveEvent,
  fetchChallengeOverview,
  fetchCoachLessons,
} from './services/sanity.js';

import { 
  fetchCompletedState, 
  fetchAllCompletedStates,
  fetchContentInProgress,
  fetchVimeoData,
  fetchContentPageUserData,
} from './services/railcontent.js';


export {
    initializeService,
    fetchSongById,
    fetchArtists,
    fetchSongArtistCount,
    fetchRelatedSongs,
    fetchAllSongs,
    fetchSongFilterOptions,
    fetchSongCount,
    fetchWorkouts,
    fetchNewReleases,
    fetchUpcomingEvents,
    fetchByRailContentId,
    fetchByRailContentIds,
    fetchAll,
    fetchAllFilterOptions,
    fetchFoundation,
    fetchMethods,
    fetchMethod,
    fetchMethodChildren,
    fetchMethodNextLesson,
    fetchMethodChildrenIds,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchAllPacks,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent,
    fetchCompletedState, 
    fetchAllCompletedStates,
    fetchContentInProgress,
    fetchCourseOverview,
    fetchChildren,
    fetchParentByRailContentId,
    fetchMethodPreviousNextLesson,
    fetchLiveEvent,
    fetchChallengeOverview,
    fetchVimeoData,
    fetchContentPageUserData,
    fetchCoachLessons,
}
