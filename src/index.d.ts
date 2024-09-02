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
    fetchCourseOverview
  } from './services/sanity.js';
  
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
        fetchMethods,
        fetchMethod,
        fetchMethodNextLesson,
        fetchMethodChildren,
        fetchMethodChildrenIds,
        fetchNextPreviousLesson,
        fetchRelatedLessons,
        fetchPackAll,
        fetchPackChildren,
        fetchLessonContent,
        fetchCourseOverview,
        fetchLiveEvent,
    }
    
}