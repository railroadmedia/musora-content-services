/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	registerAwardCallback,
	registerProgressCallback
} from './services/awards/award-callbacks.js';

import {
	getAwardStatistics,
	getCompletedAwards,
	getContentAwards,
	getInProgressAwards
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
	getActivePath,
	getDailySession,
	getEnrichedLearningPath,
	getLearningPathLessonsByIds,
	mapContentToParent,
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
	getProgressDataByIds,
	getProgressState,
	getProgressStateByIds,
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
	getMethodCard
} from './services/progress-row/method-card.js';

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
	fetchHandler,
	fetchLastInteractedChild,
	fetchLikeCount,
	fetchNextContentDataForParent,
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
	fetchAllPacks,
	fetchByRailContentId,
	fetchByRailContentIds,
	fetchByReference,
	fetchChatAndLiveEnvent,
	fetchComingSoon,
	fetchCommentModContentData,
	fetchContentRows,
	fetchFoundation,
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
	fetchMethodV2StructureFromId,
	fetchNewReleases,
	fetchNextPreviousLesson,
	fetchOtherSongVersions,
	fetchOwnedContent,
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
	getSanityDate,
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
	getUserWeeklyStats,
	pinProgressRow,
	recordUserActivity,
	recordUserPractice,
	removeUserPractice,
	restorePracticeSession,
	restoreUserActivity,
	restoreUserPractice,
	trackUserPractice,
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
		buildEntityAndTotalQuery,
		buildImageSRC,
		calculateLongestStreaks,
		closeComment,
		completeLearningPathIntroVideo,
		completeMethodIntroVideo,
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
		fetchAllCompletedStates,
		fetchAllFilterOptions,
		fetchAllPacks,
		fetchArtistBySlug,
		fetchArtistLessons,
		fetchArtists,
		fetchByRailContentId,
		fetchByRailContentIds,
		fetchByReference,
		fetchCarouselCardData,
		fetchCertificate,
		fetchChatAndLiveEnvent,
		fetchChatSettings,
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
		fetchContentRows,
		fetchCustomerPayments,
		fetchEnrollmentPageMetadata,
		fetchFollowedThreads,
		fetchForumCategories,
		fetchFoundation,
		fetchGenreBySlug,
		fetchGenreLessons,
		fetchGenres,
		fetchHandler,
		fetchHierarchy,
		fetchInstructorBySlug,
		fetchInstructorLessons,
		fetchInstructors,
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
		fetchMethodV2StructureFromId,
		fetchNewReleases,
		fetchNextContentDataForParent,
		fetchNextPreviousLesson,
		fetchNotificationSettings,
		fetchNotifications,
		fetchOtherSongVersions,
		fetchOwnedContent,
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
		getAwardStatistics,
		getCompletedAwards,
		getContentAwards,
		getContentRows,
		getDailySession,
		getEnrichedLearningPath,
		getInProgressAwards,
		getLastInteractedOf,
		getLearningPathLessonsByIds,
		getLegacyMethods,
		getLessonContentRows,
		getMethodCard,
		getMonday,
		getNavigateTo,
		getNavigateToForPlaylists,
		getNewAndUpcoming,
		getOnboardingRecommendedContent,
		getOwnedContent,
		getPracticeNotes,
		getPracticeSessions,
		getProgressDataByIds,
		getProgressRows,
		getProgressState,
		getProgressStateByIds,
		getRecent,
		getRecentActivity,
		getRecommendedForYou,
		getReportIssueOptions,
		getResumeTimeSecondsByIds,
		getSanityDate,
		getScheduleContentRows,
		getSortOrder,
		getStartedOrCompletedProgressOnly,
		getTabResults,
		getTimeRemainingUntilLocal,
		getToday,
		getUserData,
		getUserMonthlyStats,
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
	}
}

export default EventsAPI
