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
  fetchLiveEvent,
  fetchUpcomingEvents,
  fetchByRailContentId,
  fetchByRailContentIds,
  fetchAll,
  fetchAllFilterOptions,
  fetchMethodNextLesson,
  fetchMethodChildren,
  fetchNextPreviousLesson,
  fetchRelatedLessons,
  fetchPackAll,
  fetchPackChildren,
  fetchLessonContent
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
    fetchLiveEvent,
    fetchUpcomingEvents,
    fetchByRailContentId,
    fetchByRailContentIds,
    fetchAll,
    fetchAllFilterOptions,
    fetchMethodNextLesson,
    fetchMethodChildren,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent,
    fetchCurrentSongComplete, 
    fetchAllCompletedStates,
    fetchContentInProgress
}
