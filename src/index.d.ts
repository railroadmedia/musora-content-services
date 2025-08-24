/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import { globalConfig, initializeService } from './services/config.js';

import { enrollUserInGuidedCourse, fetchEnrollmentPageMetadata, guidedCourses, pinGuidedCourse, pinnedGuidedCourses, unEnrollUserInGuidedCourse, unPinGuidedCourse } from './services/content-org/guided-courses.ts';

import { addItemToPlaylist, createPlaylist, deleteItemsFromPlaylist, deletePlaylist, duplicatePlaylist, fetchPlaylist, fetchPlaylistItems, fetchUserPlaylists, likePlaylist, reportPlaylist, restoreItemFromPlaylist, togglePlaylistPrivate, undeletePlaylist, unlikePlaylist, updatePlaylist } from './services/content-org/playlists.js';

import { getContentRows, getLessonContentRows, getNewAndUpcoming, getRecent, getRecentForTab, getRecommendedForYou, getScheduleContentRows, getTabResults } from './services/content.js';

import { addContextToContent, getNavigateToForPlaylists } from './services/contentAggregator.js';

import { isContentLiked, isContentLikedByIds, likeContent, unlikeContent } from './services/contentLikes.js';

import { contentStatusCompleted, contentStatusReset, getAllCompleted, getAllStarted, getAllStartedOrCompleted, getLastInteractedOf, getNavigateTo, getNextLesson, getProgressDateByIds, getProgressPercentage, getProgressPercentageByIds, getProgressState, getProgressStateByIds, getResumeTimeSeconds, getResumeTimeSecondsByIds, getStartedOrCompletedProgressOnly, recordWatchSession } from './services/contentProgress.js';

import { ContentLikesVersionKey, ContentProgressVersionKey, DataContext, UserActivityVersionKey, verifyLocalDataContext } from './services/dataContext.js';

import { convertToTimeZone, getMonday, getTimeRemainingUntilLocal, getWeekNumber, isNextDay, isSameDate, toDayjs } from './services/dateUtils.js';

import { getActiveDiscussions } from './services/forum.js';

import { fetchAwardsForUser } from './services/gamification/awards.js';

import { applyCloudflareWrapper, applySanityTransformations, buildImageSRC } from './services/imageSRCBuilder.js';

import { extractSanityUrl, isBucketUrl, verifyImageSRC } from './services/imageSRCVerify.js';

import { assignModeratorToComment, closeComment, createComment, deleteComment, editComment, fetchAllCompletedStates, fetchCarouselCardData, fetchComment, fetchCommentRelies, fetchComments, fetchCompletedContent, fetchCompletedState, fetchContentInProgress, fetchContentPageUserData, fetchContentProgress, fetchHandler, fetchLastInteractedChild, fetchLikeCount, fetchNextContentDataForParent, fetchRecent, fetchRecentUserActivities, fetchResponseHandler, fetchSongsInProgress, fetchTopComment, fetchUserAward, fetchUserBadges, fetchUserLikes, fetchUserPermissionsData, fetchUserPracticeMeta, fetchUserPracticeNotes, fetchUserPractices, likeComment, logUserPractice, openComment, postContentComplete, postContentLiked, postContentReset, postContentRestore, postContentUnliked, postPlaylistContentEngaged, postRecordWatchSession, postUserLikes, replyToComment, reportComment, restoreComment, setStudentViewForUser, unassignModeratorToComment, unlikeComment } from './services/railcontent.js';

import { fetchSimilarItems, rankCategories, rankItems, recommendations } from './services/recommendations.js';

import { fetchAll, fetchAllFilterOptions, fetchAllPacks, fetchArtistLessons, fetchArtists, fetchByRailContentId, fetchByRailContentIds, fetchByReference, fetchChatAndLiveEnvent, fetchCoachLessons, fetchComingSoon, fetchCommentModContentData, fetchContentRows, fetchFoundation, fetchGenreLessons, fetchHierarchy, fetchLeaving, fetchLessonContent, fetchLessonsFeaturingThisContent, fetchLiveEvent, fetchMetadata, fetchMethod, fetchMethodChildren, fetchMethodChildrenIds, fetchMethodPreviousNextLesson, fetchNewReleases, fetchNextPreviousLesson, fetchOtherSongVersions, fetchPackAll, fetchPackData, fetchParentForDownload, fetchPlayAlongsCount, fetchRelatedLessons, fetchRelatedRecommendedContent, fetchRelatedSongs, fetchReturning, fetchSanity, fetchScheduledAndNewReleases, fetchScheduledReleases, fetchShows, fetchShowsData, fetchSiblingContent, fetchSongArtistCount, fetchSongById, fetchTabData, fetchTopLevelParentId, fetchUpcomingEvents, getSortOrder, jumpToContinueContent } from './services/sanity.js';

import syncAdapterFactory from './services/sync/adapters/factory.ts';

import { LokiJSAdapter } from './services/sync/adapters/lokijs.ts';

import { SQLiteAdapter } from './services/sync/adapters/sqlite.ts';

import syncDatabaseFactory from './services/sync/database/factory.ts';

import SyncExecutor from './services/sync/executor.ts';

import { syncPull, syncPush } from './services/sync/fetch.ts';

import ContentLike from './services/sync/models/ContentLike.ts';

import ContentPractice from './services/sync/models/ContentPractice.ts';

import ContentProgress from './services/sync/models/ContentProgress.ts';

import SyncStoreOrchestrator from './services/sync/orchestrator.ts';

import { SYNC_TABLES } from './services/sync/schema/index.ts';

import appSchema from './services/sync/schema/index.ts';

import SyncSerializer from './services/sync/serializers/index.ts';

import SyncStore from './services/sync/store/index.ts';

import { BaseSyncStrategy } from './services/sync/strategies/base.ts';

import PollingSyncStrategy from './services/sync/strategies/polling.ts';

import { DefaultTimers } from './services/sync/utils/timers.ts';

import { resetPassword, sendAccountSetupEmail, sendPasswordResetEmail, setupAccount, status } from './services/user/account.ts';

import { fetchChatSettings } from './services/user/chat.js';

import { fetchInterests, fetchUninterests, markContentAsInterested, markContentAsNotInterested, removeContentAsInterested, removeContentAsNotInterested } from './services/user/interests.js';

import { blockUser, deletePicture, getUserData, unblockUser, uploadPicture, uploadPictureFromS3 } from './services/user/management.js';

import { deleteNotification, fetchLiveEventPollingState, fetchNotificationSettings, fetchNotifications, fetchUnreadCount, markAllNotificationsAsRead, markNotificationAsRead, markNotificationAsUnread, pauseLiveEventPolling, restoreNotification, startLiveEventPolling, updateNotificationSetting } from './services/user/notifications.js';

import { fetchUserPermissions, reset } from './services/user/permissions.js';

import { deleteProfilePicture, otherStats } from './services/user/profile.js';

import { login, logout } from './services/user/sessions.js';

import { calculateLongestStreaks, createPracticeNotes, deletePracticeSession, deleteUserActivity, fetchRecentActivitiesActiveTabs, findIncompleteLesson, getPracticeNotes, getPracticeSessions, getProgressRows, getRecentActivity, getUserMonthlyStats, getUserPractices, getUserWeeklyStats, pinProgressRow, recordUserActivity, recordUserPractice, removeUserPractice, restorePracticeSession, restoreUserActivity, restoreUserPractice, unpinProgressRow, updatePracticeNotes, updateUserPractice, userActivityContext } from './services/userActivity.js';

declare module 'musora-content-services' {
	export {
		BaseSyncStrategy,
		ContentLikesVersionKey,
		ContentProgressVersionKey,
		DataContext,
		DefaultTimers,
		LokiJSAdapter,
		SQLiteAdapter,
		SYNC_TABLES,
		UserActivityVersionKey,
		addContextToContent,
		addItemToPlaylist,
		applyCloudflareWrapper,
		applySanityTransformations,
		assignModeratorToComment,
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
		fetchRelatedLessons,
		fetchRelatedRecommendedContent,
		fetchRelatedSongs,
		fetchResponseHandler,
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
		syncPull,
		syncPush,
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
		updateNotificationSetting,
		updatePlaylist,
		updatePracticeNotes,
		updateUserPractice,
		uploadPicture,
		uploadPictureFromS3,
		userActivityContext,
		verifyImageSRC,
		verifyLocalDataContext,
		ContentLike,
		ContentPractice,
		ContentProgress,
		PollingSyncStrategy,
		SyncExecutor,
		SyncSerializer,
		SyncStore,
		SyncStoreOrchestrator,
		appSchema,
		syncAdapterFactory,
		syncDatabaseFactory,
	}
}
