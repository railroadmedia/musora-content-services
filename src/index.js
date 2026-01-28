/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	 default as EventsAPI 
} from './services/eventsAPI';

import {
	registerAwardCallback,
	registerProgressCallback
} from './services/awards/award-callbacks.js';

import {
	getAwardStatistics,
	getCompletedAwards,
	getContentAwards,
	getContentAwardsByIds,
	getInProgressAwards,
	resetAllAwards
} from './services/awards/award-query.js';

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
	fetchArtistBySlug,
	fetchArtistLessons,
	fetchArtists
} from './services/content/artist.ts';

import {
	fetchGenreBySlug,
	fetchGenreLessons,
	fetchGenres
} from './services/content/genre.ts';

import {
	fetchInstructorBySlug,
	fetchInstructorLessons,
	fetchInstructors
} from './services/content/instructor.ts';

import {
	enrollUserInGuidedCourse,
	fetchEnrollmentPageMetadata,
	guidedCourses,
	unEnrollUserInGuidedCourse
} from './services/content-org/guided-courses.ts';

import {
	completeLearningPathIntroVideo,
	completeMethodIntroVideo,
	fetchLearningPathLessons,
	fetchLearningPathProgressCheckLessons,
	getActivePath,
	getDailySession,
	getEnrichedLearningPath,
	getEnrichedLearningPaths,
	getLearningPathLessonsByIds,
	mapContentToParent,
	onContentCompletedLearningPathActions,
	resetAllLearningPaths,
	startLearningPath,
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
	getOwnedContent,
	getRecent,
	getRecommendedForYou,
	getScheduleContentRows,
	getTabResults
} from './services/content.js';

import {
	addContextToContent,
	addContextToLearningPaths,
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
	contentStatusCompletedMany,
	contentStatusReset,
	contentStatusStarted,
	flushWatchSession,
	getAllCompleted,
	getAllCompletedByIds,
	getAllStarted,
	getAllStartedOrCompleted,
	getLastInteractedOf,
	getNavigateTo,
	getNavigateToForMethod,
	getProgressDataByIds,
	getProgressDataByIdsAndCollections,
	getProgressState,
	getProgressStateByIds,
	getResumeTimeSecondsByIds,
	getResumeTimeSecondsByIdsAndCollections,
	getStartedOrCompletedProgressOnly,
	recordWatchSession
} from './services/contentProgress.js';

import {
	clearAllCachedData,
	verifyLocalDataContext
} from './services/dataContext.js';

import {
	convertToTimeZone,
	getMonday,
	getTimeRemainingUntilLocal,
	getToday,
	getWeekNumber,
	isNextDay,
	isSameDate,
	toDayjs
} from './services/dateUtils.js';

import {
	createForumCategory,
	deleteForumCategory,
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
	fetchPost,
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
	fetchThread,
	fetchThreads,
	followThread,
	lockThread,
	markThreadAsRead,
	pinThread,
	unfollowThread,
	unlockThread,
	unpinThread,
	updateThread
} from './services/forums/threads.ts';

import {
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
	createTestUser
} from './services/liveTesting.ts';

import {
	emitProgressSaved,
	onProgressSaved
} from './services/progress-events.js';

import {
	getProgressRows,
	getUserPinProgressKey,
	pinProgressRow,
	setUserPinnedProgressRow,
	unpinProgressRow
} from './services/progress-row/base.js';

import {
	assignModeratorToComment,
	closeComment,
	createComment,
	deleteComment,
	editComment,
	fetchComment,
	fetchCommentRelies,
	fetchComments,
	fetchContentPageUserData,
	fetchLikeCount,
	fetchLiveStreamData,
	fetchRecentUserActivities,
	fetchTopComment,
	fetchUserPermissionsData,
	fetchUserPracticeMeta,
	fetchUserPracticeNotes,
	fetchUserPractices,
	likeComment,
	openComment,
	postPlaylistContentEngaged,
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
	getReportIssueOptions,
	report
} from './services/reporting/reporting.ts';

import {
	buildEntityAndTotalQuery,
	fetchAll,
	fetchAllFilterOptions,
	fetchBrandsByContentIds,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchChatAndLiveEnvent,
	fetchComingSoon,
	fetchCommentModContentData,
	fetchContentRows,
	fetchContentTypeCounts,
	fetchCourseCollectionData,
	fetchHierarchy,
	fetchLearningPathHierarchy,
	fetchLeaving,
	fetchLessonContent,
	fetchLessonsFeaturingThisContent,
	fetchLiveEvent,
	fetchMetadata,
	fetchMethodV2IntroVideo,
	fetchMethodV2Structure,
	fetchMethodV2StructureFromId,
	fetchNewReleases,
	fetchOtherSongVersions,
	fetchOwnedContent,
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
	getSanityDate,
	getSongTypesFor,
	getSortOrder,
	jumpToContinueContent
} from './services/sanity.js';

import {
	generateCommentUrl,
	generateContentUrl,
	generateContentUrlWithDomain,
	generateForumPostUrl,
	generatePlaylistUrl
} from './services/urlBuilder.ts';

import {
	confirmEmailChange,
	deleteAccount,
	numberOfActiveUsers,
	requestEmailChange,
	resetPassword,
	sendAccountSetupEmail,
	sendPasswordResetEmail,
	setupAccount,
	status,
	toggleStudentView
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
	updateBrand,
	updateDisplayName,
	uploadPicture,
	uploadPictureFromS3
} from './services/user/management.js';

import {
	fetchMemberships,
	fetchRechargeTokens,
	getUpgradePrice,
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
	generateAuthSessionUrl,
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
	getRecentActivity,
	getStreaksAndMessage,
	getUserMonthlyStats,
	getUserWeeklyStats,
	recordUserActivity,
	recordUserPractice,
	removeUserPractice,
	restorePracticeSession,
	restoreUserActivity,
	restoreUserPractice,
	trackUserPractice,
	updatePracticeNotes,
	updateUserPractice
} from './services/userActivity.js';

export {
	addContextToContent,
	addContextToLearningPaths,
	addItemToPlaylist,
	applyCloudflareWrapper,
	applySanityTransformations,
	assignModeratorToComment,
	blockUser,
	blockedUsers,
	buildEntityAndTotalQuery,
	buildImageSRC,
	calculateLongestStreaks,
	clearAllCachedData,
	closeComment,
	completeLearningPathIntroVideo,
	completeMethodIntroVideo,
	confirmEmailChange,
	contentStatusCompleted,
	contentStatusCompletedMany,
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
	deleteForumCategory,
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
	emitProgressSaved,
	enrollUserInGuidedCourse,
	extractSanityUrl,
	fetchAll,
	fetchAllFilterOptions,
	fetchArtistBySlug,
	fetchArtistLessons,
	fetchArtists,
	fetchBrandsByContentIds,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchCertificate,
	fetchChatAndLiveEnvent,
	fetchChatSettings,
	fetchComingSoon,
	fetchComment,
	fetchCommentModContentData,
	fetchCommentRelies,
	fetchComments,
	fetchCommunityGuidelines,
	fetchContentPageUserData,
	fetchContentRows,
	fetchContentTypeCounts,
	fetchCourseCollectionData,
	fetchCustomerPayments,
	fetchEnrollmentPageMetadata,
	fetchFollowedThreads,
	fetchForumCategories,
	fetchGenreBySlug,
	fetchGenreLessons,
	fetchGenres,
	fetchHierarchy,
	fetchInstructorBySlug,
	fetchInstructorLessons,
	fetchInstructors,
	fetchInterests,
	fetchLatestThreads,
	fetchLearningPathHierarchy,
	fetchLearningPathLessons,
	fetchLearningPathProgressCheckLessons,
	fetchLeaving,
	fetchLessonContent,
	fetchLessonsFeaturingThisContent,
	fetchLikeCount,
	fetchLiveEvent,
	fetchLiveEventPollingState,
	fetchLiveStreamData,
	fetchMemberships,
	fetchMetadata,
	fetchMethodV2IntroVideo,
	fetchMethodV2Structure,
	fetchMethodV2StructureFromId,
	fetchNewReleases,
	fetchNotificationSettings,
	fetchNotifications,
	fetchOtherSongVersions,
	fetchOwnedContent,
	fetchPackData,
	fetchPlayAlongsCount,
	fetchPlaylist,
	fetchPlaylistItems,
	fetchPost,
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
	fetchTabData,
	fetchThread,
	fetchThreads,
	fetchTopComment,
	fetchTopLevelParentId,
	fetchUninterests,
	fetchUnreadCount,
	fetchUpcomingEvents,
	fetchUserPermissions,
	fetchUserPermissionsData,
	fetchUserPlaylists,
	fetchUserPracticeMeta,
	fetchUserPracticeNotes,
	fetchUserPractices,
	findIncompleteLesson,
	flushWatchSession,
	followThread,
	generateAuthSessionUrl,
	generateCommentUrl,
	generateContentUrl,
	generateContentUrlWithDomain,
	generateForumPostUrl,
	generatePlaylistUrl,
	getActiveDiscussions,
	getActivePath,
	getAllCompleted,
	getAllCompletedByIds,
	getAllStarted,
	getAllStartedOrCompleted,
	getAwardStatistics,
	getCompletedAwards,
	getContentAwards,
	getContentAwardsByIds,
	getContentRows,
	getDailySession,
	getEnrichedLearningPath,
	getEnrichedLearningPaths,
	getInProgressAwards,
	getLastInteractedOf,
	getLearningPathLessonsByIds,
	getLegacyMethods,
	getLessonContentRows,
	getMonday,
	getNavigateTo,
	getNavigateToForMethod,
	getNavigateToForPlaylists,
	getNewAndUpcoming,
	getOnboardingRecommendedContent,
	getOwnedContent,
	getPracticeNotes,
	getPracticeSessions,
	getProgressDataByIds,
	getProgressDataByIdsAndCollections,
	getProgressRows,
	getProgressState,
	getProgressStateByIds,
	getRecent,
	getRecentActivity,
	getRecommendedForYou,
	getReportIssueOptions,
	getResumeTimeSecondsByIds,
	getResumeTimeSecondsByIdsAndCollections,
	getSanityDate,
	getScheduleContentRows,
	getSongTypesFor,
	getSortOrder,
	getStartedOrCompletedProgressOnly,
	getStreaksAndMessage,
	getTabResults,
	getTimeRemainingUntilLocal,
	getToday,
	getUpgradePrice,
	getUserData,
	getUserMonthlyStats,
	getUserPinProgressKey,
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
	isSameDate,
	isUsernameAvailable,
	jumpToContinueContent,
	jumpToPost,
	likeComment,
	likeContent,
	likePlaylist,
	likePost,
	lockThread,
	login,
	logout,
	mapContentToParent,
	markAllNotificationsAsRead,
	markContentAsInterested,
	markContentAsNotInterested,
	markNotificationAsRead,
	markNotificationAsUnread,
	markThreadAsRead,
	numberOfActiveUsers,
	onContentCompletedLearningPathActions,
	onProgressSaved,
	openComment,
	otherStats,
	pauseLiveEventPolling,
	pinProgressRow,
	pinThread,
	postPlaylistContentEngaged,
	rankCategories,
	rankItems,
	recommendations,
	recordUserActivity,
	recordUserPractice,
	recordWatchSession,
	registerAwardCallback,
	registerProgressCallback,
	removeContentAsInterested,
	removeContentAsNotInterested,
	removeUserPractice,
	replyToComment,
	report,
	reportComment,
	reportPlaylist,
	requestEmailChange,
	reset,
	resetAllAwards,
	resetAllLearningPaths,
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
	setUserPinnedProgressRow,
	setUserSignature,
	setupAccount,
	startLearningPath,
	startLiveEventPolling,
	startOnboarding,
	status,
	toDayjs,
	togglePlaylistPrivate,
	toggleSignaturePrivate,
	toggleStudentView,
	trackUserPractice,
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
	updateBrand,
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
