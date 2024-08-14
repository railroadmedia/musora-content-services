import {
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
    fetchMethodNextLesson,
    fetchMethodChildren,
    fetchNextPreviousLesson,
    fetchRelatedLessons,
    fetchPackAll,
    fetchPackChildren,
    fetchLessonContent
} from './index.js';

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
        fetchMethodNextLesson,
        fetchMethodChildren,
        fetchNextPreviousLesson,
        fetchRelatedLessons,
        fetchPackAll,
        fetchPackChildren,
        fetchLessonContent
    }
    
}