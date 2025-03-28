/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	addItemToPlaylist,
	createPlaylist,
	fetchUserPlaylists
} from './services/content-org/playlists.js';

import {
	getContentRows,
	getLessonContentRows,
	getNewAndUpcoming,
	getRecent,
	getRecommendedForYou,
	getScheduleContentRows,
	getTabResults
} from './services/content.js';

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
	getActiveDiscussions
} from './services/forum.js';

import {
	fetchAwardsForUser
} from './services/gamification/awards.js';

import {
	assignModeratorToComment,
	closeComment,
	countAssignmentsAndLessons,
	createComment,
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
	fetchUserPracticeMeta,
	fetchUserPractices,
	likeComment,
	likePlaylist,
	logUserPractice,
	openComment,
	pinPlaylist,
	playback,
	postChallengesCommunityNotification,
	postChallengesEnroll,
	postChallengesEnrollmentNotification,
	postChallengesHideCompletedBanner,
	postChallengesLeave,
	postChallengesSetStartDate,
	postChallengesSoloNotification,
	postChallengesUnlock,
	postContentComplete,
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
	fetchSimilarItems,
	rankCategories,
	rankItems,
	recommendations
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
	fetchLessonsFeaturingThisContent,
	fetchLiveEvent,
	fetchMetadata,
	fetchMethod,
	fetchMethodChildren,
	fetchMethodChildrenIds,
	fetchMethodPreviousNextLesson,
	fetchNewReleases,
	fetchNextPreviousLesson,
	fetchOtherSongVersions,
	fetchPackAll,
	fetchPackData,
	fetchParentForDownload,
	fetchPlayAlongsCount,
	fetchRecent,
	fetchRelatedLessons,
	fetchRelatedRecommendedContent,
	fetchRelatedSongs,
	fetchReturning,
	fetchSanity,
	fetchScheduledAndNewReleases,
	fetchScheduledReleases,
	fetchShowsData,
	fetchSongArtistCount,
	fetchSongById,
	fetchTabData,
	fetchTopLevelParentId,
	fetchUpcomingEvents,
	getSortOrder,
	jumpToContinueContent
} from './services/sanity.js';

import {
	fetchUserPermissions,
	reset
} from './services/user/permissions.js';

import {
	login,
	logout
} from './services/user/sessions.js';

import {
	deletePracticeSession,
	getPracticeSessions,
	getRecentActivity,
	getUserMonthlyStats,
	getUserPractices,
	getUserWeeklyStats,
	recordUserPractice,
	removeUserPractice,
	restorePracticeSession,
	restoreUserPractice,
	updateUserPractice
} from './services/userActivity.js';

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
		deletePracticeSession,
		duplicatePlaylist,
		editComment,
		fetchAll,
		fetchAllCompletedStates,
		fetchAllFilterOptions,
		fetchAllPacks,
		fetchArtistLessons,
		fetchArtists,
		fetchAwardsForUser,
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
		fetchLessonsFeaturingThisContent,
		fetchLiveEvent,
		fetchMetadata,
		fetchMethod,
		fetchMethodChildren,
		fetchMethodChildrenIds,
		fetchMethodPreviousNextLesson,
		fetchNewReleases,
		fetchNextContentDataForParent,
		fetchNextPreviousLesson,
		fetchOtherSongVersions,
		fetchOwnedChallenges,
		fetchPackAll,
		fetchPackData,
		fetchParentForDownload,
		fetchPinnedPlaylists,
		fetchPlayAlongsCount,
		fetchPlaylist,
		fetchPlaylistItem,
		fetchPlaylistItems,
		fetchRecent,
		fetchRelatedLessons,
		fetchRelatedRecommendedContent,
		fetchRelatedSongs,
		fetchReturning,
		fetchSanity,
		fetchScheduledAndNewReleases,
		fetchScheduledReleases,
		fetchShowsData,
		fetchSimilarItems,
		fetchSongArtistCount,
		fetchSongById,
		fetchSongsInProgress,
		fetchTabData,
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
		fetchUserPracticeMeta,
		fetchUserPractices,
		getActiveDiscussions,
		getAllCompleted,
		getAllStarted,
		getAllStartedOrCompleted,
		getContentRows,
		getLessonContentRows,
		getNewAndUpcoming,
		getPracticeSessions,
		getProgressPercentage,
		getProgressPercentageByIds,
		getProgressState,
		getProgressStateByIds,
		getRecent,
		getRecentActivity,
		getRecommendedForYou,
		getResumeTimeSeconds,
		getScheduleContentRows,
		getSortOrder,
		getTabResults,
		getUserMonthlyStats,
		getUserPractices,
		getUserWeeklyStats,
		globalConfig,
		initializeService,
		isContentLiked,
		jumpToContinueContent,
		likeComment,
		likeContent,
		likePlaylist,
		logUserPractice,
		login,
		logout,
		openComment,
		pinPlaylist,
		playback,
		postChallengesCommunityNotification,
		postChallengesEnroll,
		postChallengesEnrollmentNotification,
		postChallengesHideCompletedBanner,
		postChallengesLeave,
		postChallengesSetStartDate,
		postChallengesSoloNotification,
		postChallengesUnlock,
		postContentComplete,
		postContentLiked,
		postContentReset,
		postContentUnliked,
		postRecordWatchSession,
		rankCategories,
		rankItems,
		recommendations,
		recordUserPractice,
		recordWatchSession,
		removeUserPractice,
		replyToComment,
		reportPlaylist,
		reset,
		restorePracticeSession,
		restoreUserPractice,
		setStudentViewForUser,
		unassignModeratorToComment,
		unlikeComment,
		unlikeContent,
		unpinPlaylist,
		updatePlaylist,
		updatePlaylistItem,
		updateUserPractice,
		verifyLocalDataContext,
	}
}
