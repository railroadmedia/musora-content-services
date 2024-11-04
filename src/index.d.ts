/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	isContentLiked,
	likeContent,
	unlikeContent
} from './services/contentLikes.js';

import {
	contentStatusCompleted,
	contentStatusReset,
	contentStatusStarted,
	getProgressPercentage,
	getProgressState,
	getResumeTimeSeconds,
	recordWatchSession
} from './services/contentProgress.js';

import {
	createPlaylist,
	deletePlaylist,
	deletePlaylistLike,
	duplicatePlaylist,
	fetchAllCompletedStates,
	fetchChallengeIndexMetadata,
	fetchChallengeLessonData,
	fetchChallengeMetadata,
	fetchCompletedContent,
	fetchCompletedState,
	fetchContentInProgress,
	fetchContentPageUserData,
	fetchContentProgress,
	fetchHandler,
	fetchPlaylist,
	fetchPlaylistItems,
	fetchSongsInProgress,
	fetchUserAward,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissions,
	fetchUserPlaylists,
	likePlaylist,
	postChallengesCommunityNotification,
	postChallengesEnroll,
	postChallengesEnrollmentNotification,
	postChallengesLeave,
	postChallengesSetStartDate,
	postChallengesUnlock,
	postCompleteLesson,
	postContentCompleted,
	postContentLiked,
	postContentReset,
	postContentStarted,
	postContentUnliked,
	postRecordWatchSession,
	updatePlaylist,
	updatePlaylistItem
} from './services/railcontent.js';

import {
	fetchAll,
	fetchAllFilterOptions,
	fetchAllPacks,
	fetchAllSongs,
	fetchArtistLessons,
	fetchArtists,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchCatalogMetadata,
	fetchChallengeOverview,
	fetchChildren,
	fetchCoachLessons,
	fetchCourseOverview,
	fetchFoundation,
	fetchGenreLessons,
	fetchHierarchy,
	fetchLessonContent,
	fetchLiveEvent,
	fetchMetadata,
	fetchMethod,
	fetchMethodChildren,
	fetchMethodChildrenIds,
	fetchMethodNextLesson,
	fetchMethodPreviousNextLesson,
	fetchMethods,
	fetchNewReleases,
	fetchNextPreviousLesson,
	fetchPackAll,
	fetchPackChildren,
	fetchPackData,
	fetchParentByRailContentId,
	fetchParentForDownload,
	fetchRelatedLessons,
	fetchRelatedMethodLessons,
	fetchRelatedSongs,
	fetchSanity,
	fetchScheduledReleases,
	fetchShowsData,
	fetchSongArtistCount,
	fetchSongById,
	fetchSongCount,
	fetchSongFilterOptions,
	fetchTopLevelParentId,
	fetchUpcomingEvents,
	fetchWorkouts,
	getSortOrder
} from './services/sanity.js';

declare module 'musora-content-services' {
	export {
		contentStatusCompleted,
		contentStatusReset,
		contentStatusStarted,
		createPlaylist,
		deletePlaylist,
		deletePlaylistLike,
		duplicatePlaylist,
		fetchAll,
		fetchAllCompletedStates,
		fetchAllFilterOptions,
		fetchAllPacks,
		fetchAllSongs,
		fetchArtistLessons,
		fetchArtists,
		fetchByRailContentId,
		fetchByRailContentIds,
		fetchByReference,
		fetchCatalogMetadata,
		fetchChallengeIndexMetadata,
		fetchChallengeLessonData,
		fetchChallengeMetadata,
		fetchChallengeOverview,
		fetchChildren,
		fetchCoachLessons,
		fetchCompletedContent,
		fetchCompletedState,
		fetchContentInProgress,
		fetchContentPageUserData,
		fetchContentProgress,
		fetchCourseOverview,
		fetchFoundation,
		fetchGenreLessons,
		fetchHandler,
		fetchHierarchy,
		fetchLessonContent,
		fetchLiveEvent,
		fetchMetadata,
		fetchMethod,
		fetchMethodChildren,
		fetchMethodChildrenIds,
		fetchMethodNextLesson,
		fetchMethodPreviousNextLesson,
		fetchMethods,
		fetchNewReleases,
		fetchNextPreviousLesson,
		fetchPackAll,
		fetchPackChildren,
		fetchPackData,
		fetchParentByRailContentId,
		fetchParentForDownload,
		fetchPlaylist,
		fetchPlaylistItems,
		fetchRelatedLessons,
		fetchRelatedMethodLessons,
		fetchRelatedSongs,
		fetchSanity,
		fetchScheduledReleases,
		fetchShowsData,
		fetchSongArtistCount,
		fetchSongById,
		fetchSongCount,
		fetchSongFilterOptions,
		fetchSongsInProgress,
		fetchTopLevelParentId,
		fetchUpcomingEvents,
		fetchUserAward,
		fetchUserChallengeProgress,
		fetchUserLikes,
		fetchUserPermissions,
		fetchUserPlaylists,
		fetchWorkouts,
		getProgressPercentage,
		getProgressState,
		getResumeTimeSeconds,
		getSortOrder,
		globalConfig,
		initializeService,
		isContentLiked,
		likeContent,
		likePlaylist,
		postChallengesCommunityNotification,
		postChallengesEnroll,
		postChallengesEnrollmentNotification,
		postChallengesLeave,
		postChallengesSetStartDate,
		postChallengesUnlock,
		postCompleteLesson,
		postContentCompleted,
		postContentLiked,
		postContentReset,
		postContentStarted,
		postContentUnliked,
		postRecordWatchSession,
		recordWatchSession,
		unlikeContent,
		updatePlaylist,
		updatePlaylistItem,
	}
}
