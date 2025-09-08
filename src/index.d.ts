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
	fetchCustomerPayments
} from './services/payments.js';

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
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPracticeMeta,
	fetchUserPracticeNotes,
	fetchUserPractices,
	likeComment,
	logUserPractice,
	openComment,
	postContentComplete,
	postContentLiked,
	postContentReset,
	postContentRestore,
	postContentUnliked,
	postPlaylistContentEngaged,
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
	fetchRechargeTokens
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
	fetchUserPermissions,
	reset
} from './services/user/permissions.js';

import {
	deleteProfilePicture,
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
		createPlaylist,
		createPracticeNotes,
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
		fetchUserLikes,
		fetchUserPermissions,
		fetchUserPermissionsData,
		fetchUserPlaylists,
		fetchUserPracticeMeta,
		fetchUserPracticeNotes,
		fetchUserPractices,
		findIncompleteLesson,
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
		pinnedGuidedCourses,
		postContentComplete,
		postContentLiked,
		postContentReset,
		postContentRestore,
		postContentUnliked,
		postPlaylistContentEngaged,
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
		unlikeComment,
		unlikeContent,
		unlikePlaylist,
		unpinProgressRow,
		updateDisplayName,
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

export default EventsAPI
