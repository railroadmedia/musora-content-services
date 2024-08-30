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
  fetchMethod,
  fetchMethods,
  fetchMethodChildren,
  fetchMethodChildrenIds,
  fetchNextPreviousLesson,
  fetchRelatedLessons,
  fetchPackAll,
  fetchPackChildren,
  fetchLessonContent,
  fetchCourseOverview,
  fetchChildren,
  fetchParentByRailContentId,
  fetchMethodPreviousNextLesson,
  fetchChallengeOverview,
} from './services/sanity.js';

import { 
  fetchCurrentSongComplete, 
  fetchAllCompletedStates,
  fetchContentInProgress 
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
    fetchMethods,
    fetchMethod,
    fetchMethodChildren,
    fetchMethodNextLesson,
    fetchMethodChildrenIds,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent,
    fetchCurrentSongComplete, 
    fetchAllCompletedStates,
    fetchContentInProgress,
    fetchCourseOverview,
    fetchChildren,
    fetchParentByRailContentId,
    fetchMethodPreviousNextLesson,
    fetchChallengeOverview,
}
