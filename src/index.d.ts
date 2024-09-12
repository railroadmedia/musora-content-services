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
    fetchCourseOverview,
    fetchChallengeOverview,
    fetchScheduledReleases,
  } from './services/sanity.js';

import {
    fetchCompletedState, 
    fetchAllCompletedStates,
    fetchContentInProgress,
    fetchVimeoData,
    fetchContentPageUserData,
} from "./services/railcontent";

import { initializeService } from './services/config.js';


declare module 'musora-content-services' {
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
        fetchMethodNextLesson,
        fetchMethodChildren,
        fetchMethodChildrenIds,
        fetchNextPreviousLesson,
        fetchRelatedLessons,
        fetchAllPacks,
        fetchPackAll,
        fetchPackChildren,
        fetchLessonContent,
        fetchCourseOverview,
        fetchLiveEvent,
        fetchChallengeOverview,
        fetchVimeoData,
        fetchCompletedState, 
        fetchAllCompletedStates,
        fetchContentInProgress,
        fetchContentPageUserData,
        fetchScheduledReleases,
    }
    
}