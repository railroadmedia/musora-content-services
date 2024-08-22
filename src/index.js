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
  fetchMethods,
  fetchMethodChildren,
  fetchNextPreviousLesson,
  fetchRelatedLessons,
  fetchPackAll,
  fetchPackChildren,
  fetchLessonContent,
  fetchCourseOverview,
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
    fetchMethodNextLesson,
    fetchMethodChildren,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent,
    fetchCurrentSongComplete, 
    fetchAllCompletedStates,
    fetchContentInProgress,
    fetchCourseOverview,
}
