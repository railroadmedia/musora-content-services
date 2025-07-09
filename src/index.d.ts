/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	enrollUserInGuidedCourse,
	fetchEnrollmentPageMetadata,
	guidedCourses,
	pinGuidedCourse,
	pinnedGuidedCourses,
	unEnrollUserInGuidedCourse,
	unPinGuidedCourse
} from './services/content-org/guided-courses.ts';

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
	restoreItemFromPlaylist,
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
	getStartedOrCompletedProgressOnly,
	recordWatchSession
} from './services/contentProgress.js';

import {
	verifyLocalDataContext
} from './services/dataContext.js';

import {
	convertToTimeZone,
	getMonday,
	getTimeRemainingUntilLocal,
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
	fetchComment,
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
	restoreComment,
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
	resetPassword,
	sendAccountSetupEmail,
	sendPasswordResetEmail,
	status
} from './services/user/account.ts';

import {
	fetchChatSettings
} from './services/user/chat.js';

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
	deletePicture,
	unblockUser,
	uploadPicture,
	uploadPictureFromS3
} from './services/user/management.js';

import {
	deleteNotification,
	fetchNotificationSettings,
	fetchNotifications,
	fetchUnreadCount,
	markAllNotificationsAsRead,
	markNotificationAsRead,
	markNotificationAsUnread,
	updateNotificationSetting
} from './services/user/notifications.js';

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
	getPracticeNotes,
	getPracticeSessions,
	getProgressRows,
	getRecentActivity,
	getUserMonthlyStats,
	getUserPractices,
	getUserWeeklyStats,
	pinProgressRow,
	recordUserActivity,
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
		deleteNotification,
		deletePicture,
		deletePlaylist,
		deletePracticeSession,
		deleteUserActivity,
		duplicatePlaylist,
		editComment,
		enrollUserInGuidedCourse,
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
		fetchChatSettings,
		fetchCoachLessons,
		fetchComingSoon,
		fetchComment,
		fetchCommentModContentData,
		fetchCommentRelies,
		fetchComments,
		fetchCompletedChallenges,
		fetchCompletedContent,
		fetchCompletedState,
		fetchContentInProgress,
		fetchContentPageUserData,
		fetchContentProgress,
		fetchEnrollmentPageMetadata,
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
		fetchNotificationSettings,
		fetchNotifications,
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
		fetchUnreadCount,
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
		getStartedOrCompletedProgressOnly,
		getTabResults,
		getTimeRemainingUntilLocal,
		getUserMonthlyStats,
		getUserPractices,
		getUserWeeklyStats,
		getWeekNumber,
		globalConfig,
		guidedCourses,
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
		markAllNotificationsAsRead,
		markContentAsInterested,
		markContentAsNotInterested,
		markNotificationAsRead,
		markNotificationAsUnread,
		openComment,
		otherStats,
		pinGuidedCourse,
		pinProgressRow,
		pinnedGuidedCourses,
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
		resetPassword,
		restoreComment,
		restoreItemFromPlaylist,
		restorePracticeSession,
		restoreUserPractice,
		sendAccountSetupEmail,
		sendPasswordResetEmail,
		setStudentViewForUser,
		status,
		togglePlaylistPrivate,
		unEnrollUserInGuidedCourse,
		unPinGuidedCourse,
		unassignModeratorToComment,
		unblockUser,
		undeletePlaylist,
		unlikeComment,
		unlikeContent,
		unlikePlaylist,
		unpinProgressRow,
		updateNotificationSetting,
		updatePlaylist,
		updatePracticeNotes,
		updateUserPractice,
		uploadPicture,
		uploadPictureFromS3,
		verifyImageSRC,
		verifyLocalDataContext,
	}
}
