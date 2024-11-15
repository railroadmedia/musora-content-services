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
	assignmentStatusCompleted,
	assignmentStatusReset,
	contentStatusCompleted,
	contentStatusReset,
	getAllCompleted,
	getAllStarted,
	getAllStartedOrCompleted,
	getProgressPercentage,
	getProgressPercentageByIds,
	getProgressState,
	getProgressStateByIds,
	getResumeTimeSeconds,
	recordWatchSession
} from './services/contentProgress.js';

import {
	addItemToPlaylist,
	countAssignmentsAndLessons,
	createPlaylist,
	deletePlaylist,
	deletePlaylistItem,
	deletePlaylistLike,
	duplicatePlaylist,
	fetchAllCompletedStates,
	fetchChallengeIndexMetadata,
	fetchChallengeLessonData,
	fetchChallengeMetadata,
	fetchChallengeUserActiveChallenges,
	fetchCompletedContent,
	fetchCompletedState,
	fetchContentInProgress,
	fetchContentPageUserData,
	fetchContentProgress,
	fetchHandler,
	fetchPinnedPlaylists,
	fetchPlaylist,
	fetchPlaylistItem,
	fetchPlaylistItems,
	fetchSongsInProgress,
	fetchUserAward,
	fetchUserBadges,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPlaylists,
	likePlaylist,
	pinPlaylist,
	postChallengesCommunityNotification,
	postChallengesCompleteLesson,
	postChallengesEnroll,
	postChallengesEnrollmentNotification,
	postChallengesLeave,
	postChallengesSetStartDate,
	postChallengesUnlock,
	postContentCompleted,
	postContentLiked,
	postContentReset,
	postContentUnliked,
	postRecordWatchSession,
	unpinPlaylist,
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
	fetchAssignments,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchCatalogMetadata,
	fetchChallengeOverview,
	fetchChildren,
	fetchCoachLessons,
	fetchCommentModContentData,
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

import {
	fetchUserPermissions,
	reset
} from './services/userPermissions.js';

declare module 'musora-content-services' {
	export {
		addItemToPlaylist,
		assignmentStatusCompleted,
		assignmentStatusReset,
		contentStatusCompleted,
		contentStatusReset,
		countAssignmentsAndLessons,
		createPlaylist,
		deletePlaylist,
		deletePlaylistItem,
		deletePlaylistLike,
		duplicatePlaylist,
		fetchAll,
		fetchAllCompletedStates,
		fetchAllFilterOptions,
		fetchAllPacks,
		fetchAllSongs,
		fetchArtistLessons,
		fetchArtists,
		fetchAssignments,
		fetchByRailContentId,
		fetchByRailContentIds,
		fetchByReference,
		fetchCatalogMetadata,
		fetchChallengeIndexMetadata,
		fetchChallengeLessonData,
		fetchChallengeMetadata,
		fetchChallengeOverview,
		fetchChallengeUserActiveChallenges,
		fetchChildren,
		fetchCoachLessons,
		fetchCommentModContentData,
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
		fetchPinnedPlaylists,
		fetchPlaylist,
		fetchPlaylistItem,
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
		fetchUserBadges,
		fetchUserChallengeProgress,
		fetchUserLikes,
		fetchUserPermissions,
		fetchUserPermissionsData,
		fetchUserPlaylists,
		fetchWorkouts,
		getAllCompleted,
		getAllStarted,
		getAllStartedOrCompleted,
		getProgressPercentage,
		getProgressPercentageByIds,
		getProgressState,
		getProgressStateByIds,
		getResumeTimeSeconds,
		getSortOrder,
		globalConfig,
		initializeService,
		isContentLiked,
		likeContent,
		likePlaylist,
		pinPlaylist,
		postChallengesCommunityNotification,
		postChallengesCompleteLesson,
		postChallengesEnroll,
		postChallengesEnrollmentNotification,
		postChallengesLeave,
		postChallengesSetStartDate,
		postChallengesUnlock,
		postContentCompleted,
		postContentLiked,
		postContentReset,
		postContentUnliked,
		postRecordWatchSession,
		recordWatchSession,
		reset,
		unlikeContent,
		unpinPlaylist,
		updatePlaylist,
		updatePlaylistItem,
	}
}
