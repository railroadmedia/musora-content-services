/**
 * @module Railcontent-Services
 */
import { globalConfig } from './config.js'
import { fetchJSONHandler } from '../lib/httpHelper.js'
import { convertToTimeZone } from './dateUtils.js';

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [
  'fetchUserLikes',
  'postContentLiked',
  'postContentUnliked',
  'postRecordWatchSession',
  'postContentStarted',
  'postContentComplete',
  'postContentReset',
  'fetchUserPermissionsData',
]

let challengeIndexMetaDataPromise = null

/**
 * Fetches the completion status of a specific lesson for the current user.
 *
 * @param {string} content_id - The ID of the lesson content to check.
 * @returns {Promise<Object|null>} - Returns the completion status object if found, otherwise null.
 * @example
 * fetchCurrentSongComplete('user123', 'lesson456', 'csrf-token')
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedState(content_id) {
  const url = `/content/user_progress/${globalConfig.sessionConfig.userId}?content_ids[]=${content_id}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()

    if (result && result[content_id]) {
      return result[content_id] // Return the correct object
    } else {
      return null // Handle unexpected structure
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches the completion status for multiple songs for the current user.
 *
 * @param {Array<string>} contentIds - An array of content IDs to check.
 * @returns {Promise<Object|null>} - Returns an object containing completion statuses keyed by content ID, or null if an error occurs.
 * @example
 * fetchAllCompletedStates('user123', ['song456', 'song789'], 'csrf-token')
 *   .then(statuses => console.log(statuses))
 *   .catch(error => console.error(error));
 */
export async function fetchAllCompletedStates(contentIds) {
  const url = `/content/user_progress/${globalConfig.sessionConfig.userId}?${contentIds.map((id) => `content_ids[]=${id}`).join('&')}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of songs that are currently in progress for the current user.
 *
 * @param {string} brand - The brand associated with the songs.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress songs if found, otherwise null.
 * @example
 * fetchSongsInProgress('drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchSongsInProgress(brand) {
  const url = `/content/in_progress/${globalConfig.sessionConfig.userId}?content_type=song&brand=${brand}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('fetchSongsInProgress', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of content that is currently in progress for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchContentInProgress('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchContentInProgress(type = 'all', brand, { page, limit } = {}) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''

  if (type === 'all') {
    url = `/content/in_progress/${globalConfig.sessionConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/in_progress/${globalConfig.sessionConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }
  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('contentInProgress', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of content that has been completed for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchCompletedContent('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedContent(type = 'all', brand, { page, limit } = {}) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''

  if (type === 'all') {
    url = `/content/completed/${globalConfig.sessionConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/completed/${globalConfig.sessionConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }
  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('completed content', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches user context data for a specific piece of content.
 *
 * @param {int} contentId - The content id.
 * @returns {Promise<Object|null>} - Returns an object containing user context data if found, otherwise null.
 * @example
 * fetchContentPageUserData(406548)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchContentPageUserData(contentId) {
  let url = `/api/content/v1/${contentId}/user_data/${globalConfig.sessionConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      console.log('fetchContentPageUserData', result)
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches the ID and Type of the piece of content that would be the next one for the user
 *
 * @param {int} contentId - The id of the parent (method, level, or course) piece of content.
 * @returns {Promise<Object|null>} - Returns and Object with the id and type of the next piece of content if found, otherwise null.
 */
export async function fetchNextContentDataForParent(contentId) {
  let url = `/content/${contentId}/next/${globalConfig.sessionConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      // console.log('fetchNextContentDataForParent', result);
      return result.next
    } else {
      console.log('fetchNextContentDataForParent result not json')
      return null
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

export async function fetchUserPermissionsData() {
  let url = `/content/user/permissions`
  // in the case of an unauthorized user, we return empty permissions
  return (await fetchHandler(url, 'get')) ?? []
}

async function fetchDataHandler(url, dataVersion, method = 'get') {
  return fetchHandler(url, method, dataVersion)
}

async function postDataHandler(url, data) {
  return fetchHandler(url, 'post', null, data)
}

async function patchDataHandler(url, data) {
  return fetchHandler(url, 'patch', null, data)
}

async function deleteDataHandler(url, data) {
  return fetchHandler(url, 'delete')
}

export async function fetchLikeCount(contendId){
  const url  = `/api/content/v1/content/like_count/${contendId}`
  return await fetchDataHandler(url)
}

export async function fetchUserLikes(currentVersion) {
  let url = `/api/content/v1/user/likes`
  return fetchDataHandler(url, currentVersion)
}

export async function postContentLiked(contentId) {
  let url = `/api/content/v1/user/likes/${contentId}`
  return await postDataHandler(url)
}

export async function postContentUnliked(contentId) {
  let url = `/api/content/v1/user/likes/${contentId}`
  return await deleteDataHandler(url)
}

export async function fetchContentProgress(currentVersion) {
  let url = `/content/user/progress/all`
  return fetchDataHandler(url, currentVersion)
}

export async function postRecordWatchSession(
  contentId,
  mediaTypeId,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  sessionId
) {
  let url = `/railtracker/v2/media-playback-session`
  return postDataHandler(url, {
    content_id: contentId,
    media_type_id: mediaTypeId,
    media_length_seconds: mediaLengthSeconds,
    current_second: currentSeconds,
    seconds_played: secondsPlayed,
    session_id: sessionId,
  })
}

/**
 * Fetch enrolled user data for a given challenge. Intended to be used in the enrolled modal
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeMetadata(contentId) {
  let url = `/challenges/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch lesson, user, and challenge data for a given lesson
 *
 * @param contentId - railcontent id of the lesson
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeLessonData(contentId) {
  let url = `/challenges/lessons/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all owned brand challenges for user
 * @param {string|null} brand - brand
 * @param {int} page - page of data to pull
 * @param {int} limit - number of elements to pull
 * @returns {Promise<any|null>}
 */
export async function fetchOwnedChallenges(brand = null, page, limit) {
  let brandParam = brand ? `&brand=${brand}` : ''
  let pageAndLimit = `?page=${page}&limit=${limit}`
  let url = `/challenges/tab_owned/get${pageAndLimit}${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all completed brand challenges for user
 * @param {string|null} brand - brand
 * @param {int} page - page of data to pull
 * @param {int} limit - number of elements to pull
 * @returns {Promise<any|null>}
 */
export async function fetchCompletedChallenges(brand = null, page, limit) {
  let brandParam = brand ? `&brand=${brand}` : ''
  let pageAndLimit = `?page=${page}&limit=${limit}`
  let url = `/challenges/tab_completed/get${pageAndLimit}${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch challenge, lesson, and user metadata for a given challenge
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function fetchUserChallengeProgress(contentId) {
  let url = `/challenges/user_data/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch the user's best award for this challenge
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>} - streamed PDF
 */
export async function fetchUserAward(contentId) {
  let url = `/challenges/download_award/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Get challenge duration, user progress, and status for the list of challenges
 * Intended to be used on the index page for challenges
 *
 * @param {array} contentIds - arary of railcontent ids of the challenges
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeIndexMetadata(contentIds) {
  if (!challengeIndexMetaDataPromise) {
    challengeIndexMetaDataPromise = getChallengeIndexMetadataPromise()
  }
  let results = await challengeIndexMetaDataPromise
  if (Array.isArray(contentIds)) {
    results = results.filter(function (challenge) {
      return contentIds.includes(challenge.content_id)
    })
  }
  return results
}

async function getChallengeIndexMetadataPromise() {
  let url = `/challenges/user_progress_for_index_page/get`
  const result = await fetchHandler(url, 'get')
  challengeIndexMetaDataPromise = null
  return result
}

/**
 * Get active brand challenges for the authorized user
 *
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeUserActiveChallenges(brand = null) {
  let brandParam = brand ? `?brand=${brand}` : ''
  let url = `/challenges/user_active_challenges/get${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch All Carousel Card Data
 *
 * @returns {Promise<any|null>}
 */
export async function fetchCarouselCardData(brand = null) {
  const brandParam = brand ? `?brand=${brand}` : ''
  let url = `/api/v2/content/carousel${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all completed badges for the user ordered by completion date descending
 *
 * @param {string|null} brand -
 * @returns {Promise<any|null>}
 */
export async function fetchUserBadges(brand = null) {
  let brandParam = brand ? `?brand=${brand}` : ''
  let url = `/challenges/user_badges/get${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Enroll a user in a challenge and set the start date of the challenge to the provided day.
 * Clears any existing progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @param {string} startDate - prefered format YYYYMMDD, but any Carbon parsable string will do.
 * @returns {Promise<any|null>}
 */
export async function postChallengesSetStartDate(contentId, startDate) {
  let url = `/challenges/set_start_date/${contentId}?start_date=${startDate}`
  return await fetchHandler(url, 'post')
}

/**
 * Enroll the user in the provided challenge and set to unlocked
 * Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesUnlock(contentId) {
  let url = `/challenges/unlock/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enroll the user in the given challenge on the challenge published_on date
 *  Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesEnroll(contentId) {
  let url = `/challenges/enroll/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Remove the user from the provided challenge
 * Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesLeave(contentId) {
  let url = `/challenges/leave/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable enrollment notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesEnrollmentNotification(contentId) {
  let url = `/challenges/notifications/enrollment_open/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable community notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesCommunityNotification(contentId) {
  let url = `/challenges/notifications/community_reminders/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable solo notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesSoloNotification(contentId) {
  let url = `/challenges/notifications/solo_reminders/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Hide challenge completed award bannare
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesHideCompletedBanner(contentId) {
  let url = `/challenges/hide_completed_banner/${contentId}`
  return await fetchHandler(url, 'post')
}

export async function postContentComplete(contentId) {
  let url = `/api/content/v1/user/progress/complete/${contentId}`
  return postDataHandler(url)
}

export async function postContentReset(contentId) {
  let url = `/api/content/v1/user/progress/reset/${contentId}`
  return postDataHandler(url)
}

/**
 * Set a user's StudentView Flag
 *
 * @param {int|string} userId - id of the user (must be currently authenticated)
 * @param {bool} enable - truthy value to enable student view
 * @returns {Promise<any|null>}
 */
export async function setStudentViewForUser(userId, enable) {
  let url = `/user-management-system/user/update/${userId}`
  let data = { use_student_view: enable ? 1 : 0 }
  return await patchDataHandler(url, data)
}

/**
 * Fetch the top comment for a given content
 *
 * @param {int} railcontentId - The railcontent id to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an comment object
 */
export async function fetchTopComment(railcontentId) {
  const url = `/api/content/v1/${railcontentId}/comments?filter=top`
  return await fetchHandler(url)
}

/**
 *
 * @param {int} railcontentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchComments(railcontentId, page = 1, limit = 20) {
  const url = `/api/content/v1/${railcontentId}/comments?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

/**
 *
 * @param {int} commentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchCommentRelies(commentId, page = 1, limit = 20) {
  const url = `/api/content/v1/comments/${commentId}/replies?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function deleteComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  return await fetchHandler(url, 'DELETE')
}

/**
 * @param {int} commentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function replyToComment(commentId, comment) {
  const data = { comment: comment }
  const url = `/api/content/v1/comments/${commentId}/reply`
  return await postDataHandler(url, data)
}

/**
 * @param {int} railcontentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function createComment(railcontentId, comment) {
  const data = {
    comment: comment,
    content_id: railcontentId,
  }
  const url = `/api/content/v1/comments/store`
  return await postDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function assignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/assign_moderator`
  return await postDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unassignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/unassign_moderator`
  return await postDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function likeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/like`
  return await postDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unlikeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/like`
  return await deleteDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function closeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    conversation_status: 'closed',
  }
  return await patchDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function openComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    conversation_status: 'open',
  }
  return await patchDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function editComment(commentId, comment) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    comment: comment,
  }
  return await patchDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @param {string} issue
 * @returns {Promise<*|null>}
 */
export async function reportComment(commentId, issue) {
  const url = `/api/content/v1/comments/${commentId}/report`
  const data = {
    issue: issue,
  }
  return await postDataHandler(url, data)
}

export async function fetchUserPractices({ currentVersion, userId } = {}) {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const url = `/api/user/practices/v1/practices${query}`;
  const response = await fetchDataHandler(url, currentVersion);
  const { data, version } = response;
  const userPractices = data;

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;


  const formattedPractices = userPractices.reduce((acc, practice) => {
    // Convert UTC date to user's local date (still a Date object)
    const utcDate = new Date(practice.day);
    const localDate = convertToTimeZone(utcDate, userTimeZone);

    const userTimeZoneDay =
      localDate.getFullYear() + '-' +
      String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(localDate.getDate()).padStart(2, '0');

    if (!acc[userTimeZoneDay]) {
      acc[userTimeZoneDay] = [];
    }

    acc[userTimeZoneDay].push({
      id: practice.id,
      duration_seconds: practice.duration_seconds,
    });

    return acc;
  }, {});

  return {
    data: {
      practices: formattedPractices,
    },
    version,
  };
}

export async function logUserPractice(practiceDetails) {
  const url = `/api/user/practices/v1/practices`
  return await fetchHandler(url, 'POST', null, practiceDetails)
}
export async function fetchUserPracticeMeta(practiceIds, userId = null) {
  if (practiceIds.length == 0) {
    return []
  }
  const params = new URLSearchParams();
  practiceIds.forEach(id => params.append('practice_ids[]', id));

  if (userId !== null) {
    params.append('user_id', userId);
  }
  const url = `/api/user/practices/v1/practices?${params.toString()}`
  return await fetchHandler(url, 'GET', null)
}

/**
 * Fetches user practice notes for a specific date.
 * @param {string} date - The date for which to fetch practice notes (format: YYYY-MM-DD).
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the practice notes if found, otherwise null.
 *
 * @example
 * fetchUserPracticeNotes('2025-04-10')
 *   .then(notes => console.log(notes))
 *   .catch(error => console.error(error));
 */
export async function fetchUserPracticeNotes(date) {
  const url = `/api/user/practices/v1/notes?date=${date}`
  return await fetchHandler(url, 'GET', null)
}

function fetchAbsolute(url, params) {
  if (globalConfig.sessionConfig.authToken) {
    params.headers['Authorization'] = `Bearer ${globalConfig.sessionConfig.authToken}`
  }

  if (globalConfig.baseUrl) {
    if (url.startsWith('/')) {
      return fetch(globalConfig.baseUrl + url, params)
    }
  }
  return fetch(url, params)
}
export async function fetchHandler(url, method = 'get', dataVersion = null, body = null) {
  return fetchJSONHandler(
    url,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    method,
    dataVersion,
    body
  )
}
