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
	getRecentForTab,
	getRecommendedForYou,
	getScheduleContentRows,
	getTabResults
} from './services/content.js';

import {
	addContextToContent,
	getNavigateToForPlaylists
} from './services/contentAggregator.js';

import {
	isContentLiked,
	isContentLikedByIds,
	likeContent,
	unlikeContent
} from './services/contentLikes.js';

import {
	contentStatusCompleted,
	contentStatusReset,
	getAllCompleted,
	getAllStarted,
	getAllStartedOrCompleted,
	getLastInteractedOf,
	getNavigateTo,
	getNextLesson,
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
	isSameDate,
	toDayjs
} from './services/dateUtils.js';

import {
	getActiveDiscussions
} from './services/forum.js';

import {
	createForumCategory,
	fetchForumCategories,
	updateForumCategory
} from './services/forums/categories.ts';

import {
	createThread,
	followThread,
	unfollowThread
} from './services/forums/threads.ts';

import {
	fetchAwardsForUser,
	fetchCertificate
} from './services/gamification/awards.ts';

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
	fetchComment,
	fetchCommentRelies,
	fetchComments,
	fetchCompletedContent,
	fetchCompletedState,
	fetchContentInProgress,
	fetchContentPageUserData,
	fetchContentProgress,
	fetchHandler,
	fetchLastInteractedChild,
	fetchLikeCount,
	fetchNextContentDataForParent,
	fetchRecent,
	fetchRecentUserActivities,
	fetchSongsInProgress,
	fetchTopComment,
	fetchUserAward,
	fetchUserBadges,
	fetchUserPermissionsData,
	fetchUserPracticeMeta,
	fetchUserPracticeNotes,
	fetchUserPractices,
	likeComment,
	logUserPractice,
	openComment,
	postContentComplete,
	postContentReset,
	postContentRestore,
	postPlaylistContentEngaged,
	postRecordWatchSession,
	postUserLikes,
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
	fetchContentRows,
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
	fetchRelatedLessons,
	fetchRelatedRecommendedContent,
	fetchRelatedSongs,
	fetchReturning,
	fetchSanity,
	fetchScheduledAndNewReleases,
	fetchScheduledReleases,
	fetchShows,
	fetchShowsData,
	fetchSiblingContent,
	fetchSongArtistCount,
	fetchSongById,
	fetchTabData,
	fetchTopLevelParentId,
	fetchUpcomingEvents,
	getSortOrder,
	jumpToContinueContent
} from './services/sanity.js';

import {
	confirmEmailChange,
	requestEmailChange,
	resetPassword,
	sendAccountSetupEmail,
	sendPasswordResetEmail,
	setupAccount,
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
	blockedUsers,
	deletePicture,
	getUserData,
	isDisplayNameAvailable,
	unblockUser,
	updateDisplayName,
	uploadPicture,
	uploadPictureFromS3
} from './services/user/management.js';

import {
	fetchMemberships,
	fetchRechargeTokens,
	upgradeSubscription
} from './services/user/memberships.js';

import {
	deleteNotification,
	fetchLiveEventPollingState,
	fetchNotificationSettings,
	fetchNotifications,
	fetchUnreadCount,
	markAllNotificationsAsRead,
	markNotificationAsRead,
	markNotificationAsUnread,
	pauseLiveEventPolling,
	restoreNotification,
	startLiveEventPolling,
	updateNotificationSetting
} from './services/user/notifications.js';

import {
	fetchCustomerPayments
} from './services/user/payments.ts';

import {
	fetchUserPermissions,
	reset
} from './services/user/permissions.js';

import {
	deleteProfilePicture,
	otherStats
} from './services/user/profile.js';

import {
	login,
	loginWithProvider,
	logout
} from './services/user/sessions.js';

import {
	calculateLongestStreaks,
	createPracticeNotes,
	deletePracticeSession,
	deleteUserActivity,
	fetchRecentActivitiesActiveTabs,
	findIncompleteLesson,
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
	restoreUserActivity,
	restoreUserPractice,
	unpinProgressRow,
	updatePracticeNotes,
	updateUserPractice
} from './services/userActivity.js';

import {
	 default as EventsAPI 
} from './services/eventsAPI';

declare module 'musora-content-services' {
	export {
		addContextToContent,
		addItemToPlaylist,
		applyCloudflareWrapper,
		applySanityTransformations,
		assignModeratorToComment,
		blockUser,
		blockedUsers,
		buildImageSRC,
		calculateLongestStreaks,
		closeComment,
		confirmEmailChange,
		contentStatusCompleted,
		contentStatusReset,
		convertToTimeZone,
		createComment,
		createForumCategory,
		createPlaylist,
		createPracticeNotes,
		createThread,
		deleteComment,
		deleteItemsFromPlaylist,
		deleteNotification,
		deletePicture,
		deletePlaylist,
		deletePracticeSession,
		deleteProfilePicture,
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
		fetchCertificate,
		fetchChatAndLiveEnvent,
		fetchChatSettings,
		fetchCoachLessons,
		fetchComingSoon,
		fetchComment,
		fetchCommentModContentData,
		fetchCommentRelies,
		fetchComments,
		fetchCompletedContent,
		fetchCompletedState,
		fetchContentInProgress,
		fetchContentPageUserData,
		fetchContentProgress,
		fetchContentRows,
		fetchCustomerPayments,
		fetchEnrollmentPageMetadata,
		fetchForumCategories,
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
		fetchLiveEventPollingState,
		fetchMemberships,
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
		fetchPackAll,
		fetchPackData,
		fetchParentForDownload,
		fetchPlayAlongsCount,
		fetchPlaylist,
		fetchPlaylistItems,
		fetchRecent,
		fetchRecentActivitiesActiveTabs,
		fetchRecentUserActivities,
		fetchRechargeTokens,
		fetchRelatedLessons,
		fetchRelatedRecommendedContent,
		fetchRelatedSongs,
		fetchReturning,
		fetchSanity,
		fetchScheduledAndNewReleases,
		fetchScheduledReleases,
		fetchShows,
		fetchShowsData,
		fetchSiblingContent,
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
		fetchUserPermissions,
		fetchUserPermissionsData,
		fetchUserPlaylists,
		fetchUserPracticeMeta,
		fetchUserPracticeNotes,
		fetchUserPractices,
		findIncompleteLesson,
		followThread,
		getActiveDiscussions,
		getAllCompleted,
		getAllStarted,
		getAllStartedOrCompleted,
		getContentRows,
		getLastInteractedOf,
		getLessonContentRows,
		getMonday,
		getNavigateTo,
		getNavigateToForPlaylists,
		getNewAndUpcoming,
		getNextLesson,
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
		getRecentForTab,
		getRecommendedForYou,
		getResumeTimeSeconds,
		getResumeTimeSecondsByIds,
		getScheduleContentRows,
		getSortOrder,
		getStartedOrCompletedProgressOnly,
		getTabResults,
		getTimeRemainingUntilLocal,
		getUserData,
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
		isDisplayNameAvailable,
		isNextDay,
		isSameDate,
		jumpToContinueContent,
		likeComment,
		likeContent,
		likePlaylist,
		logUserPractice,
		login,
		loginWithProvider,
		logout,
		markAllNotificationsAsRead,
		markContentAsInterested,
		markContentAsNotInterested,
		markNotificationAsRead,
		markNotificationAsUnread,
		openComment,
		otherStats,
		pauseLiveEventPolling,
		pinGuidedCourse,
		pinProgressRow,
		postContentComplete,
		postContentReset,
		postContentRestore,
		postPlaylistContentEngaged,
		postRecordWatchSession,
		postUserLikes,
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
		requestEmailChange,
		reset,
		resetPassword,
		restoreComment,
		restoreItemFromPlaylist,
		restoreNotification,
		restorePracticeSession,
		restoreUserActivity,
		restoreUserPractice,
		sendAccountSetupEmail,
		sendPasswordResetEmail,
		setStudentViewForUser,
		setupAccount,
		startLiveEventPolling,
		status,
		toDayjs,
		togglePlaylistPrivate,
		unEnrollUserInGuidedCourse,
		unPinGuidedCourse,
		unassignModeratorToComment,
		unblockUser,
		undeletePlaylist,
		unfollowThread,
		unlikeComment,
		unlikeContent,
		unlikePlaylist,
		unpinProgressRow,
		updateDisplayName,
		updateForumCategory,
		updateNotificationSetting,
		updatePlaylist,
		updatePracticeNotes,
		updateUserPractice,
		upgradeSubscription,
		uploadPicture,
		uploadPictureFromS3,
		verifyImageSRC,
		verifyLocalDataContext,
	}
}

export default EventsAPI
