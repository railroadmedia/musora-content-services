/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	addItemToPlaylist,
	createPlaylist,
	deleteItemsFromPlaylist,
	deletePlaylist,
	duplicatePlaylist,
	fetchPlaylist,
	fetchPlaylistItems,
	fetchUserPlaylists,
	likePlaylist,
	reportPlaylist,
	togglePlaylistPrivate,
	undeletePlaylist,
	unlikePlaylist,
	updatePlaylist
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
	addContextToContent
} from './services/contentAggregator.js';

import {
	isContentLiked,
	isContentLikedByIds,
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
	getProgressDateByIds,
	getProgressPercentage,
	getProgressPercentageByIds,
	getProgressState,
	getProgressStateByIds,
	getResumeTimeSeconds,
	getResumeTimeSecondsByIds,
	recordWatchSession
} from './services/contentProgress.js';

import {
	verifyLocalDataContext
} from './services/dataContext.js';

import {
	convertToTimeZone,
	getMonday,
	getWeekNumber,
	isNextDay,
	isSameDate
} from './services/dateUtils.js';

import {
	getActiveDiscussions
} from './services/forum.js';

import {
	fetchAwardsForUser
} from './services/gamification/awards.js';

import {
	applyCloudflareWrapper,
	applySanityTransformations,
	buildImageSRC
} from './services/imageSRCBuilder.js';

import {
	extractSanityUrl,
	isBucketUrl,
	verifyImageSRC
} from './services/imageSRCVerify.js';

import {
	assignModeratorToComment,
	closeComment,
	createComment,
	deleteComment,
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
	fetchLastInteractedChild,
	fetchLikeCount,
	fetchNextContentDataForParent,
	fetchOwnedChallenges,
	fetchRecentUserActivities,
	fetchSongsInProgress,
	fetchTopComment,
	fetchUserAward,
	fetchUserBadges,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPracticeMeta,
	fetchUserPracticeNotes,
	fetchUserPractices,
	likeComment,
	logUserPractice,
	openComment,
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
	reportComment,
	setStudentViewForUser,
	unassignModeratorToComment,
	unlikeComment
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
	fetchShows,
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
	fetchInterests,
	fetchUninterests,
	markContentAsInterested,
	markContentAsNotInterested,
	removeContentAsInterested,
	removeContentAsNotInterested
} from './services/user/interests.js';

import {
	blockUser,
	unblockUser
} from './services/user/management.js';

import {
	fetchUserPermissions,
	reset
} from './services/user/permissions.js';

import {
	otherStats
} from './services/user/profile.js';

import {
	login,
	logout
} from './services/user/sessions.js';

import {
	calculateLongestStreaks,
	createPracticeNotes,
	deletePracticeSession,
	deleteUserActivity,
	getFormattedType,
	getPracticeNotes,
	getPracticeSessions,
	getProgressRows,
	getRecentActivity,
	getUserMonthlyStats,
	getUserPractices,
	getUserWeeklyStats,
<<<<<<< HEAD
	pinProgressRow,
=======
	recordUserActivity,
>>>>>>> project-v2
	recordUserPractice,
	removeUserPractice,
	restorePracticeSession,
	restoreUserPractice,
	unpinProgressRow,
	updatePracticeNotes,
	updateUserPractice
} from './services/userActivity.js';

declare module 'musora-content-services' {
	export {
		addContextToContent,
		addItemToPlaylist,
		applyCloudflareWrapper,
		applySanityTransformations,
		assignModeratorToComment,
		assignmentStatusCompleted,
		assignmentStatusReset,
		blockUser,
		buildImageSRC,
		calculateLongestStreaks,
		closeComment,
		contentStatusCompleted,
		contentStatusReset,
		convertToTimeZone,
		createComment,
		createPlaylist,
		createPracticeNotes,
		deleteComment,
		deleteItemsFromPlaylist,
		deletePlaylist,
		deletePracticeSession,
		deleteUserActivity,
		duplicatePlaylist,
		editComment,
		extractSanityUrl,
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
		fetchInterests,
		fetchLastInteractedChild,
		fetchLeaving,
		fetchLessonContent,
		fetchLessonsFeaturingThisContent,
		fetchLikeCount,
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
		fetchPlayAlongsCount,
		fetchPlaylist,
		fetchPlaylistItems,
		fetchRecent,
		fetchRecentUserActivities,
		fetchRelatedLessons,
		fetchRelatedRecommendedContent,
		fetchRelatedSongs,
		fetchReturning,
		fetchSanity,
		fetchScheduledAndNewReleases,
		fetchScheduledReleases,
		fetchShows,
		fetchShowsData,
		fetchSimilarItems,
		fetchSongArtistCount,
		fetchSongById,
		fetchSongsInProgress,
		fetchTabData,
		fetchTopComment,
		fetchTopLevelParentId,
		fetchUninterests,
		fetchUpcomingEvents,
		fetchUserAward,
		fetchUserBadges,
		fetchUserChallengeProgress,
		fetchUserLikes,
		fetchUserPermissions,
		fetchUserPermissionsData,
		fetchUserPlaylists,
		fetchUserPracticeMeta,
		fetchUserPracticeNotes,
		fetchUserPractices,
		getActiveDiscussions,
		getAllCompleted,
		getAllStarted,
		getAllStartedOrCompleted,
		getContentRows,
		getFormattedType,
		getLessonContentRows,
		getMonday,
		getNewAndUpcoming,
		getPracticeNotes,
		getPracticeSessions,
		getProgressDateByIds,
		getProgressPercentage,
		getProgressPercentageByIds,
		getProgressRows,
		getProgressState,
		getProgressStateByIds,
		getRecent,
		getRecentActivity,
		getRecommendedForYou,
		getResumeTimeSeconds,
		getResumeTimeSecondsByIds,
		getScheduleContentRows,
		getSortOrder,
		getTabResults,
		getUserMonthlyStats,
		getUserPractices,
		getUserWeeklyStats,
		getWeekNumber,
		globalConfig,
		initializeService,
		isBucketUrl,
		isContentLiked,
		isContentLikedByIds,
		isNextDay,
		isSameDate,
		jumpToContinueContent,
		likeComment,
		likeContent,
		likePlaylist,
		logUserPractice,
		login,
		logout,
		markContentAsInterested,
		markContentAsNotInterested,
		openComment,
<<<<<<< HEAD
		pinProgressRow,
=======
		otherStats,
>>>>>>> project-v2
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
		recordUserActivity,
		recordUserPractice,
		recordWatchSession,
		removeContentAsInterested,
		removeContentAsNotInterested,
		removeUserPractice,
		replyToComment,
		reportComment,
		reportPlaylist,
		reset,
		restorePracticeSession,
		restoreUserPractice,
		setStudentViewForUser,
		togglePlaylistPrivate,
		unassignModeratorToComment,
		unblockUser,
		undeletePlaylist,
		unlikeComment,
		unlikeContent,
		unlikePlaylist,
		unpinProgressRow,
		updatePlaylist,
		updatePracticeNotes,
		updateUserPractice,
		verifyImageSRC,
		verifyLocalDataContext,
	}
}
