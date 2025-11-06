/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	enrollUserInGuidedCourse,
	fetchEnrollmentPageMetadata,
	guidedCourses,
	unEnrollUserInGuidedCourse
} from './services/content-org/guided-courses.ts';

import {
	fetchLearningPathLessons,
	getActivePath,
	getDailySession,
	updateActivePath,
	updateDailySession
} from './services/content-org/learning-paths.ts';

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
	getLegacyMethods,
	getLessonContentRows,
	getNewAndUpcoming,
	getRecent,
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
	contentStatusStarted,
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
	createForumCategory,
	fetchForumCategories,
	updateForumCategory
} from './services/forums/categories.ts';

import {
	getActiveDiscussions
} from './services/forums/forums.ts';

import {
	createPost,
	deletePost,
	fetchCommunityGuidelines,
	fetchPosts,
	jumpToPost,
	likePost,
	search,
	unlikePost,
	updatePost
} from './services/forums/posts.ts';

import {
	createThread,
	deleteThread,
	fetchFollowedThreads,
	fetchLatestThreads,
	fetchThreads,
	followThread,
	lockThread,
	pinThread,
	unfollowThread,
	unlockThread,
	unpinThread,
	updateThread
} from './services/forums/threads.ts';

import {
	fetchAwardsForUser,
	fetchCertificate,
	getAwardDataForGuidedContent
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
	createTestUser
} from './services/liveTesting.ts';

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
	postContentStart,
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
	fetchMethodV2IntroVideo,
	fetchMethodV2Structure,
	fetchNewReleases,
	fetchNextPreviousLesson,
	fetchOtherSongVersions,
	fetchPackAll,
	fetchPackData,
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
	deleteAccount,
	numberOfActiveUsers,
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
	getUserSignature,
	isUsernameAvailable,
	setUserSignature,
	toggleSignaturePrivate,
	unblockUser,
	updateDisplayName,
	uploadPicture,
	uploadPictureFromS3
} from './services/user/management.js';

import {
	fetchMemberships,
	fetchRechargeTokens,
	restorePurchases,
	upgradeSubscription
} from './services/user/memberships.ts';

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
	getOnboardingRecommendedContent,
	startOnboarding,
	updateOnboarding,
	userOnboardingForBrand
} from './services/user/onboarding.ts';

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
	PermissionsAdapter,
	PermissionsV1Adapter,
	PermissionsV2Adapter,
	getPermissionsAdapter,
	resetAdapterInstance,
	getPermissionsVersion,
	isPermissionsV1,
	isPermissionsV2
} from './services/permissions/index.js';

import {
	 default as EventsAPI 
} from './services/eventsAPI';

export {
	PermissionsAdapter,
	PermissionsV1Adapter,
	PermissionsV2Adapter,
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
	contentStatusStarted,
	convertToTimeZone,
	createComment,
	createForumCategory,
	createPlaylist,
	createPost,
	createPracticeNotes,
	createTestUser,
	createThread,
	deleteAccount,
	deleteComment,
	deleteItemsFromPlaylist,
	deleteNotification,
	deletePicture,
	deletePlaylist,
	deletePost,
	deletePracticeSession,
	deleteProfilePicture,
	deleteThread,
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
	fetchCommunityGuidelines,
	fetchCompletedContent,
	fetchCompletedState,
	fetchContentInProgress,
	fetchContentPageUserData,
	fetchContentProgress,
	fetchContentRows,
	fetchCustomerPayments,
	fetchEnrollmentPageMetadata,
	fetchFollowedThreads,
	fetchForumCategories,
	fetchFoundation,
	fetchGenreLessons,
	fetchHandler,
	fetchHierarchy,
	fetchInterests,
	fetchLastInteractedChild,
	fetchLatestThreads,
	fetchLearningPathLessons,
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
	fetchMethodV2IntroVideo,
	fetchMethodV2Structure,
	fetchNewReleases,
	fetchNextContentDataForParent,
	fetchNextPreviousLesson,
	fetchNotificationSettings,
	fetchNotifications,
	fetchOtherSongVersions,
	fetchPackAll,
	fetchPackData,
	fetchPlayAlongsCount,
	fetchPlaylist,
	fetchPlaylistItems,
	fetchPosts,
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
	fetchThreads,
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
	followThread,
	getActiveDiscussions,
	getActivePath,
	getAllCompleted,
	getAllStarted,
	getAllStartedOrCompleted,
	getAwardDataForGuidedContent,
	getContentRows,
	getDailySession,
	getLastInteractedOf,
	getLegacyMethods,
	getLessonContentRows,
	getMonday,
	getNavigateTo,
	getNavigateToForPlaylists,
	getNewAndUpcoming,
	getNextLesson,
	getOnboardingRecommendedContent,
        getPermissionsAdapter,
	getPermissionsVersion,
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
	getUserData,
	getUserMonthlyStats,
	getUserPractices,
	getUserSignature,
	getUserWeeklyStats,
	getWeekNumber,
	globalConfig,
	guidedCourses,
	initializeService,
	isBucketUrl,
	isContentLiked,
	isContentLikedByIds,
	isNextDay,
	isPermissionsV1,
	isPermissionsV2,
	isSameDate,
	isUsernameAvailable,
	jumpToContinueContent,
	jumpToPost,
	likeComment,
	likeContent,
	likePlaylist,
	likePost,
	lockThread,
	logUserPractice,
	login,
	logout,
	markAllNotificationsAsRead,
	markContentAsInterested,
	markContentAsNotInterested,
	markNotificationAsRead,
	markNotificationAsUnread,
	numberOfActiveUsers,
	openComment,
	otherStats,
	pauseLiveEventPolling,
	pinProgressRow,
	pinThread,
	postContentComplete,
	postContentLiked,
	postContentReset,
	postContentRestore,
	postContentStart,
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
	resetAdapterInstance,
	resetPassword,
	restoreComment,
	restoreItemFromPlaylist,
	restoreNotification,
	restorePracticeSession,
	restorePurchases,
	restoreUserActivity,
	restoreUserPractice,
	search,
	sendAccountSetupEmail,
	sendPasswordResetEmail,
	setStudentViewForUser,
	setUserSignature,
	setupAccount,
	startLiveEventPolling,
	startOnboarding,
	status,
	toDayjs,
	togglePlaylistPrivate,
	toggleSignaturePrivate,
	unEnrollUserInGuidedCourse,
	unassignModeratorToComment,
	unblockUser,
	undeletePlaylist,
	unfollowThread,
	unlikeComment,
	unlikeContent,
	unlikePlaylist,
	unlikePost,
	unlockThread,
	unpinProgressRow,
	unpinThread,
	updateActivePath,
	updateDailySession,
	updateDisplayName,
	updateForumCategory,
	updateNotificationSetting,
	updateOnboarding,
	updatePlaylist,
	updatePost,
	updatePracticeNotes,
	updateThread,
	updateUserPractice,
	upgradeSubscription,
	uploadPicture,
	uploadPictureFromS3,
	userOnboardingForBrand,
	verifyImageSRC,
	verifyLocalDataContext,
};

export default EventsAPI
