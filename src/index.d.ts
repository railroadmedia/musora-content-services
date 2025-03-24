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
	verifyLocalDataContext
} from './services/dataContext.js';

import {
	setLastUpdatedTime,
	wasLastUpdateOlderThanXSeconds
} from './services/lastUpdated.js';

import {
	addItemToPlaylist,
	assignModeratorToComment,
	closeComment,
	countAssignmentsAndLessons,
	createComment,
	createPlaylist,
	deleteComment,
	deletePlaylist,
	deletePlaylistItem,
	deletePlaylistLike,
	duplicatePlaylist,
	editComment,
	fetchAllCompletedStates,
	fetchCarouselCardData,
	fetchChallengeIndexMetadata,
	fetchChallengeLessonData,
	fetchChallengeMetadata,
	fetchChallengeUserActiveChallenges,
	fetchCommentRelies,
	fetchComments,
	fetchCompletedChallenges,
	fetchCompletedContent,
	fetchCompletedState,
	fetchContentInProgress,
	fetchContentPageUserData,
	fetchContentProgress,
	fetchHandler,
	fetchNextContentDataForParent,
	fetchOwnedChallenges,
	fetchPinnedPlaylists,
	fetchPlaylist,
	fetchPlaylistItem,
	fetchPlaylistItems,
	fetchSongsInProgress,
	fetchTopComment,
	fetchUserAward,
	fetchUserBadges,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPlaylists,
	likeComment,
	likePlaylist,
	openComment,
	pinPlaylist,
	playback,
	postChallengesCommunityNotification,
	postChallengesCompleteLesson,
	postChallengesEnroll,
	postChallengesEnrollmentNotification,
	postChallengesHideCompletedBanner,
	postChallengesLeave,
	postChallengesSetStartDate,
	postChallengesSoloNotification,
	postChallengesUnlock,
	postContentCompleted,
	postContentLiked,
	postContentReset,
	postContentUnliked,
	postRecordWatchSession,
	replyToComment,
	reportPlaylist,
	setStudentViewForUser,
	unassignModeratorToComment,
	unlikeComment,
	unpinPlaylist,
	updatePlaylist,
	updatePlaylistItem
} from './services/railcontent.js';

import {
	rankCategories,
	rankItems,
	similarItems
} from './services/recommendations.js';

import {
	fetchAll,
	fetchAllFilterOptions,
	fetchAllPacks,
	fetchArtistLessons,
	fetchArtists,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchChatAndLiveEnvent,
	fetchCoachLessons,
	fetchComingSoon,
	fetchCommentModContentData,
	fetchFoundation,
	fetchGenreLessons,
	fetchHierarchy,
	fetchLeaving,
	fetchLessonContent,
	fetchLiveEvent,
	fetchMetadata,
	fetchMethod,
	fetchMethodChildren,
	fetchMethodChildrenIds,
	fetchMethodPreviousNextLesson,
	fetchNewReleases,
	fetchNextPreviousLesson,
	fetchPackAll,
	fetchPackData,
	fetchParentForDownload,
	fetchPlayAlongsCount,
	fetchRelatedLessons,
	fetchRelatedSongs,
	fetchRelatedTutorials,
	fetchReturning,
	fetchSanity,
	fetchScheduledReleases,
	fetchShowsData,
	fetchSongArtistCount,
	fetchSongById,
	fetchTopLevelParentId,
	fetchUpcomingEvents,
	getSortOrder,
	jumpToContinueContent
} from './services/sanity.js';

import {
	fetchUserPermissions,
	reset
} from './services/userPermissions.js';

declare module 'musora-content-services' {
	export {
		addItemToPlaylist,
		assignModeratorToComment,
		assignmentStatusCompleted,
		assignmentStatusReset,
		closeComment,
		contentStatusCompleted,
		contentStatusReset,
		countAssignmentsAndLessons,
		createComment,
		createPlaylist,
		deleteComment,
		deletePlaylist,
		deletePlaylistItem,
		deletePlaylistLike,
		duplicatePlaylist,
		editComment,
		fetchAll,
		fetchAllCompletedStates,
		fetchAllFilterOptions,
		fetchAllPacks,
		fetchArtistLessons,
		fetchArtists,
		fetchByRailContentId,
		fetchByRailContentIds,
		fetchByReference,
		fetchCarouselCardData,
		fetchChallengeIndexMetadata,
		fetchChallengeLessonData,
		fetchChallengeMetadata,
		fetchChallengeUserActiveChallenges,
		fetchChatAndLiveEnvent,
		fetchCoachLessons,
		fetchComingSoon,
		fetchCommentModContentData,
		fetchCommentRelies,
		fetchComments,
		fetchCompletedChallenges,
		fetchCompletedContent,
		fetchCompletedState,
		fetchContentInProgress,
		fetchContentPageUserData,
		fetchContentProgress,
		fetchFoundation,
		fetchGenreLessons,
		fetchHandler,
		fetchHierarchy,
		fetchLeaving,
		fetchLessonContent,
		fetchLiveEvent,
		fetchMetadata,
		fetchMethod,
		fetchMethodChildren,
		fetchMethodChildrenIds,
		fetchMethodPreviousNextLesson,
		fetchNewReleases,
		fetchNextContentDataForParent,
		fetchNextPreviousLesson,
		fetchOwnedChallenges,
		fetchPackAll,
		fetchPackData,
		fetchParentForDownload,
		fetchPinnedPlaylists,
		fetchPlayAlongsCount,
		fetchPlaylist,
		fetchPlaylistItem,
		fetchPlaylistItems,
		fetchRelatedLessons,
		fetchRelatedSongs,
		fetchRelatedTutorials,
		fetchReturning,
		fetchSanity,
		fetchScheduledReleases,
		fetchShowsData,
		fetchSongArtistCount,
		fetchSongById,
		fetchSongsInProgress,
		fetchTopComment,
		fetchTopLevelParentId,
		fetchUpcomingEvents,
		fetchUserAward,
		fetchUserBadges,
		fetchUserChallengeProgress,
		fetchUserLikes,
		fetchUserPermissions,
		fetchUserPermissionsData,
		fetchUserPlaylists,
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
		jumpToContinueContent,
		likeComment,
		likeContent,
		likePlaylist,
		openComment,
		pinPlaylist,
		playback,
		postChallengesCommunityNotification,
		postChallengesCompleteLesson,
		postChallengesEnroll,
		postChallengesEnrollmentNotification,
		postChallengesHideCompletedBanner,
		postChallengesLeave,
		postChallengesSetStartDate,
		postChallengesSoloNotification,
		postChallengesUnlock,
		postContentCompleted,
		postContentLiked,
		postContentReset,
		postContentUnliked,
		postRecordWatchSession,
		rankCategories,
		rankItems,
		recordWatchSession,
		replyToComment,
		reportPlaylist,
		reset,
		setLastUpdatedTime,
		setStudentViewForUser,
		similarItems,
		unassignModeratorToComment,
		unlikeComment,
		unlikeContent,
		unpinPlaylist,
		updatePlaylist,
		updatePlaylistItem,
		verifyLocalDataContext,
		wasLastUpdateOlderThanXSeconds,
	}
}
