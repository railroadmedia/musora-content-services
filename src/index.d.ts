/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/

import {
	globalConfig,
	initializeService
} from './services/config.js';

import {
<<<<<<< HEAD
	getLessonContentRows,
	getRecent,
	getTabResults
=======
	getLessonContentRows
>>>>>>> project-v2
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
<<<<<<< HEAD
	setLastUpdatedTime,
	wasLastUpdateOlderThanXSeconds
} from './services/lastUpdated.js';

import {
	addItemToPlaylist,
	countAssignmentsAndLessons,
	createPlaylist,
	deletePlaylist,
	deletePlaylistItem,
	deletePlaylistLike,
	duplicatePlaylist,
	fetchAllCompletedStates,
	fetchCarouselCardData,
	fetchChallengeIndexMetadata,
	fetchChallengeLessonData,
	fetchChallengeMetadata,
	fetchChallengeUserActiveChallenges,
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
	fetchUserAward,
	fetchUserBadges,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPlaylists,
	likePlaylist,
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
	reportPlaylist,
	setStudentViewForUser,
	unpinPlaylist,
	updatePlaylist,
	updatePlaylistItem
} from './services/railcontent.js';

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
	fetchCommentModContentData,
	fetchFoundation,
	fetchGenreLessons,
	fetchHierarchy,
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
	fetchRecent,
	fetchRelatedLessons,
	fetchRelatedSongs,
	fetchSanity,
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
=======
	verifyLocalDataContext
} from './services/dataContext.js';

import {
	setLastUpdatedTime,
	wasLastUpdateOlderThanXSeconds
} from './services/lastUpdated.js';

import {
	addItemToPlaylist,
	countAssignmentsAndLessons,
	createPlaylist,
	deletePlaylist,
	deletePlaylistItem,
	deletePlaylistLike,
	duplicatePlaylist,
	fetchAllCompletedStates,
	fetchCarouselCardData,
	fetchChallengeIndexMetadata,
	fetchChallengeLessonData,
	fetchChallengeMetadata,
	fetchChallengeUserActiveChallenges,
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
	fetchUserAward,
	fetchUserBadges,
	fetchUserChallengeProgress,
	fetchUserLikes,
	fetchUserPermissionsData,
	fetchUserPlaylists,
	likePlaylist,
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
	reportPlaylist,
	setStudentViewForUser,
	unpinPlaylist,
	updatePlaylist,
	updatePlaylistItem
} from './services/railcontent.js';

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
>>>>>>> project-v2
	fetchUserPermissions,
	reset
} from './services/userPermissions.js';

declare module 'musora-content-services' {
	export {
		addItemToPlaylist,
		assignmentStatusCompleted,
		assignmentStatusReset,
		contentStatusCompleted,
		contentStatusReset,
		countAssignmentsAndLessons,
		createPlaylist,
		deletePlaylist,
		deletePlaylistItem,
		deletePlaylistLike,
		duplicatePlaylist,
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
<<<<<<< HEAD
=======
		fetchComingSoon,
>>>>>>> project-v2
		fetchCommentModContentData,
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
<<<<<<< HEAD
=======
		fetchLeaving,
>>>>>>> project-v2
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
<<<<<<< HEAD
		fetchRecent,
		fetchRelatedLessons,
		fetchRelatedSongs,
=======
		fetchRelatedLessons,
		fetchRelatedSongs,
		fetchReturning,
>>>>>>> project-v2
		fetchSanity,
		fetchScheduledReleases,
		fetchShowsData,
		fetchSongArtistCount,
		fetchSongById,
		fetchSongsInProgress,
<<<<<<< HEAD
		fetchTabData,
=======
>>>>>>> project-v2
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
		getLessonContentRows,
		getProgressPercentage,
		getProgressPercentageByIds,
		getProgressState,
		getProgressStateByIds,
<<<<<<< HEAD
		getRecent,
		getResumeTimeSeconds,
		getSortOrder,
		getTabResults,
=======
		getResumeTimeSeconds,
		getSortOrder,
>>>>>>> project-v2
		globalConfig,
		initializeService,
		isContentLiked,
		jumpToContinueContent,
		likeContent,
		likePlaylist,
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
		recordWatchSession,
		reportPlaylist,
		reset,
		setLastUpdatedTime,
		setStudentViewForUser,
		unlikeContent,
		unpinPlaylist,
		updatePlaylist,
		updatePlaylistItem,
<<<<<<< HEAD
=======
		verifyLocalDataContext,
>>>>>>> project-v2
		wasLastUpdateOlderThanXSeconds,
	}
}
