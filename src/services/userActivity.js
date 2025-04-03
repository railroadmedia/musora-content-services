/**
 * @module User-Activity
 */

import {fetchUserPractices, logUserPractice, fetchUserPracticeMeta, fetchHandler} from './railcontent'
import { DataContext, UserActivityVersionKey } from './dataContext.js'
import {fetchByRailContentIds} from "./sanity";
import {lessonTypesMapping} from "../contentTypeConfig";

const recentActivity = {
  data: [
    { id: 5,title: '3 Easy Classical Songs For Beginners', action: 'Comment', thumbnail: 'https://s3-alpha-sig.figma.com/img/22c3/1eb9/d819a2c6727b78deb2fcf051349a0667?Expires=1743984000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=RGusttOtnWP80iL68~l4XqFrQNe-kOTnUSLtMXQwGJNLfWNze6~fMZ15LsH4IYpz85mJKgILgCegi1sEPF6loBJpKYF9AH5HC2Zz1fenM1T3V387dgb4FifujKtR-DJuBpknPNFvZ9wC9ebCfoXhc1HLe7BJUDSr8gJssiqsimQPU-9TanAOJAFTaxOfvQ0-WEW1VIdCWLX0OOjn1qs~jZTeOGcxy3b~OD1CxiUmwp5tA3lBgqya18Mf8kmcfHjByNmYysd2FwV5tS19dCnmzbE9hwvLwMOnQ38SYOKhxCLsteDRBIxLNjTGJFDUm4wF~089Kkd1zA8pn8-kVfYtwg__', summary: 'Just completed the advanced groove lesson! I’m finally feeling more confident with my fills. Thanks for the clear explanations and practice tips! ', date: '2025-03-25 10:09:48' },
    { id:4, title: 'Piano Man by Billy Joel', action: 'Play', thumbnail:'https://s3-alpha-sig.figma.com/img/fab0/fffe/3cb08e0256a02a18ac37b2db1c2b4a1f?Expires=1743984000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=smjF95zM9b469lFJ8F6mmjpRs4jPlDcBnflDXc9G~Go1ab87fnWpmg-megUoLmSkqu-Rf3s8P5buzqNP-YnqQl413g3grqNURTIwHRaI2HplN1OXL~OBLU9jHjgQxZmMI6VfSLs301W~cU9NHmMLYRr38r9mVQM6ippSMawj7MFSywiPhvHSvAIXt65o6HlNszhq1n5eZmxVdiL7tjifSja~fGVtHDsX0wuD3L-KAN5TIqywAgRzzFFMHw3yYxiOHajbRSi0s0LJNIHRF4iBJFFZWVXY5vdNX5YKmAmblnbfYIK3GrwJiaVEv6rGzOo~nN4Zh-FKJWvjyPd2oBmfbg__', date: '2025-03-25 10:04:48'  },
    { id:3, title: 'General Piano Discussion', action: 'Post', thumbnail: 'https://s3-alpha-sig.figma.com/img/22c3/1eb9/d819a2c6727b78deb2fcf051349a0667?Expires=1743984000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=RGusttOtnWP80iL68~l4XqFrQNe-kOTnUSLtMXQwGJNLfWNze6~fMZ15LsH4IYpz85mJKgILgCegi1sEPF6loBJpKYF9AH5HC2Zz1fenM1T3V387dgb4FifujKtR-DJuBpknPNFvZ9wC9ebCfoXhc1HLe7BJUDSr8gJssiqsimQPU-9TanAOJAFTaxOfvQ0-WEW1VIdCWLX0OOjn1qs~jZTeOGcxy3b~OD1CxiUmwp5tA3lBgqya18Mf8kmcfHjByNmYysd2FwV5tS19dCnmzbE9hwvLwMOnQ38SYOKhxCLsteDRBIxLNjTGJFDUm4wF~089Kkd1zA8pn8-kVfYtwg__', summary: 'Just completed the advanced groove lesson! I’m finally feeling more confident with my fills. Thanks for the clear explanations and practice tips! ', date: '2025-03-25 09:49:48' },
    { id:2, title: 'Welcome To Guitareo', action: 'Complete', thumbnail: 'https://s3-alpha-sig.figma.com/img/22c3/1eb9/d819a2c6727b78deb2fcf051349a0667?Expires=1743984000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=RGusttOtnWP80iL68~l4XqFrQNe-kOTnUSLtMXQwGJNLfWNze6~fMZ15LsH4IYpz85mJKgILgCegi1sEPF6loBJpKYF9AH5HC2Zz1fenM1T3V387dgb4FifujKtR-DJuBpknPNFvZ9wC9ebCfoXhc1HLe7BJUDSr8gJssiqsimQPU-9TanAOJAFTaxOfvQ0-WEW1VIdCWLX0OOjn1qs~jZTeOGcxy3b~OD1CxiUmwp5tA3lBgqya18Mf8kmcfHjByNmYysd2FwV5tS19dCnmzbE9hwvLwMOnQ38SYOKhxCLsteDRBIxLNjTGJFDUm4wF~089Kkd1zA8pn8-kVfYtwg__',date: '2025-03-25 09:34:48'  },
    { id:1, title: 'Welcome To Guitareo', action: 'Start', thumbnail: 'https://s3-alpha-sig.figma.com/img/22c3/1eb9/d819a2c6727b78deb2fcf051349a0667?Expires=1743984000&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=RGusttOtnWP80iL68~l4XqFrQNe-kOTnUSLtMXQwGJNLfWNze6~fMZ15LsH4IYpz85mJKgILgCegi1sEPF6loBJpKYF9AH5HC2Zz1fenM1T3V387dgb4FifujKtR-DJuBpknPNFvZ9wC9ebCfoXhc1HLe7BJUDSr8gJssiqsimQPU-9TanAOJAFTaxOfvQ0-WEW1VIdCWLX0OOjn1qs~jZTeOGcxy3b~OD1CxiUmwp5tA3lBgqya18Mf8kmcfHjByNmYysd2FwV5tS19dCnmzbE9hwvLwMOnQ38SYOKhxCLsteDRBIxLNjTGJFDUm4wF~089Kkd1zA8pn8-kVfYtwg__',date: '2025-03-25 09:04:48'  },
  ],
}

const DATA_KEY_PRACTICES = 'practices'
const DATA_KEY_LAST_UPDATED_TIME = 'u'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const streakMessages = {
  startStreak: "Start your streak by taking any lesson!",
  restartStreak: "Restart your streak by taking any lesson!",

  // Messages when last active day is today
  dailyStreak: (streak) => `Nice! You have a ${streak} day streak. Way to keep it going!`,
  dailyStreakShort: (streak) => `Nice! You have a ${streak} day streak!`,
  weeklyStreak: (streak) => `You have a ${streak} week streak! Way to keep up the momentum!`,
  greatJobWeeklyStreak: (streak) => `Great job! You have a ${streak} week streak! Way to keep it going!`,

  // Messages when last active day is NOT today
  dailyStreakReminder: (streak) => `You have a ${streak} day streak! Keep it going with any lesson or song.`,
  weeklyStreakKeepUp: (streak) => `You have a ${streak} week streak! Keep up the momentum!`,
  weeklyStreakReminder: (streak) => `You have a ${streak} week streak! Keep it going with any lesson or song!`,
};


export let userActivityContext = new DataContext(UserActivityVersionKey, fetchUserPractices)

/**
 * Retrieves user activity statistics for the current week, including daily activity and streak messages.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing weekly user activity statistics.
 *
 * @example
 * // Retrieve user activity statistics for the current week
 * getUserWeeklyStats()
 *   .then(stats => console.log(stats))
 *   .catch(error => console.error(error));
 */
export async function getUserWeeklyStats() {
  let data = await userActivityContext.getData()

  let practices = data?.[DATA_KEY_PRACTICES] ?? {}
  let sortedPracticeDays = Object.keys(practices)
    .map(date => new Date(date))
    .sort((a, b) => b - a);

  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let startOfWeek = getMonday(today) // Get last Monday
  let dailyStats = []

  for (let i = 0; i < 7; i++) {
    let day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    let hasPractice = sortedPracticeDays.some(practiceDate => isSameDate(practiceDate, day));
    let isActive = isSameDate(today, day)
    let type = (hasPractice ? 'tracked' : (isActive ? 'active' : 'none'))
    dailyStats.push({ key: i, label: DAYS[i], isActive, inStreak: hasPractice, type })
  }

  let { streakMessage } = getStreaksAndMessage(practices);

  return { data: { dailyActiveStats: dailyStats, streakMessage, practices } }
}

/**
 * Retrieves user activity statistics for a specified month, including daily and weekly activity data.
 *
 * @param {number} [year=new Date().getFullYear()] - The year for which to retrieve the statistics.
 * @param {number} [month=new Date().getMonth()] - The month (0-indexed) for which to retrieve the statistics.
 * @returns {Promise<Object>} - A promise that resolves to an object containing user activity statistics.
 *
 * @example
 * // Retrieve user activity statistics for the current month
 * getUserMonthlyStats()
 *   .then(stats => console.log(stats))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Retrieve user activity statistics for March 2024
 * getUserMonthlyStats(2024, 2)
 *   .then(stats => console.log(stats))
 *   .catch(error => console.error(error));
 */
export async function getUserMonthlyStats(year = new Date().getFullYear(), month = new Date().getMonth(), day = 1) {
  let data = await userActivityContext.getData()
  let practices = data?.[DATA_KEY_PRACTICES] ?? {}
  let sortedPracticeDays = Object.keys(practices)
    .map(date => new Date(date))
    .sort((a, b) => b - a);

  // Get the first day of the specified month and the number of days in that month
  let firstDayOfMonth = new Date(year, month, 1)
  let today = new Date()

  let startOfMonth = getMonday(firstDayOfMonth)
  let endOfMonth = new Date(year, month + 1, 0)
  while (endOfMonth.getDay() !== 0) {
    endOfMonth.setDate(endOfMonth.getDate() + 1)
  }

  let daysInMonth = Math.ceil((endOfMonth - startOfMonth) / (1000 * 60 * 60 * 24)) + 1;

  let dailyStats = []
  let practiceDuration = 0
  let daysPracticed = 0
  let weeklyStats = {}

  for (let i = 0; i < daysInMonth; i++) {
    let day = new Date(startOfMonth)
    day.setDate(startOfMonth.getDate() + i)
    let dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    // Check if the user has activity for the day
    let dayActivity = practices[dayKey] ?? null
    let hasPractice = sortedPracticeDays.some(practiceDate => isSameDate(practiceDate, day));
    let weekKey = getWeekNumber(day)

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { key: weekKey, inStreak: false };
    }

    if (hasPractice) {
      practiceDuration += dayActivity.reduce((sum, entry) => sum + entry.duration_seconds, 0)
      daysPracticed++;
    }
    let isActive = isSameDate(today, day)
    let type = (hasPractice ? 'tracked' : (isActive ? 'active' : 'none'))

    let isInStreak = dayActivity !== null;
    if (isInStreak) {
      weeklyStats[weekKey].inStreak = true;
    }

    dailyStats.push({
      key: i,
      label: dayKey,
      isActive,
      inStreak: dayActivity !== null,
      type,
    })
  }

  let filteredPractices = Object.keys(practices)
    .filter((date) => new Date(date) <= endOfMonth)
    .reduce((obj, key) => {
      obj[key] = practices[key]
      return obj
    }, {})

  let { currentDailyStreak, currentWeeklyStreak } = calculateStreaks(filteredPractices);

  return { data: {
      dailyActiveStats:  dailyStats,
      weeklyActiveStats: Object.values(weeklyStats),
      practiceDuration,
      currentDailyStreak,
      currentWeeklyStreak,
      daysPracticed,
    }
  }
}

export async function getUserPractices() {
  let data = await userActivityContext.getData()
  return data?.[DATA_KEY_PRACTICES] ?? []
}
/**
 * Records user practice data and updates both the remote and local activity context.
 *
 * @param {Object} practiceDetails - The details of the practice session.
 * @param {number} practiceDetails.duration_seconds - The duration of the practice session in seconds.
 * @param {boolean} [practiceDetails.auto=true] - Whether the session was automatically logged.
 * @param {number} [practiceDetails.content_id] - The ID of the practiced content (if available).
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @returns {Promise<Object>} - A promise that resolves to the response from logging the user practice.
 *
 * @example
 * // Record an auto practice session with content ID
 * recordUserPractice({ content_id: 123, duration_seconds: 300 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Record a custom practice session with additional details
 * recordUserPractice({
 *   duration_seconds: 600,
 *   auto: false,
 *   category_id: 5,
 *   title: "Guitar Warm-up",
 *   thumbnail_url: "https://example.com/thumbnail.jpg"
 * })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function recordUserPractice(practiceDetails) {
  practiceDetails.auto = 0;
  if (practiceDetails.content_id) {
    practiceDetails.auto = 1;
  }

  await userActivityContext.update(
    async function (localContext) {
      let userData = localContext.data ?? { [DATA_KEY_PRACTICES]: {} };
      localContext.data = userData;
    },
    async function () {
      const response = await logUserPractice(practiceDetails);
      if (response) {
        await userActivityContext.updateLocal(async function (localContext) {
          const newPractices = response.data ?? []
          newPractices.forEach(newPractice => {
            const { date } = newPractice;
            if (!localContext.data[DATA_KEY_PRACTICES][date]) {
              localContext.data[DATA_KEY_PRACTICES][date] = [];
            }
              localContext.data[DATA_KEY_PRACTICES][date][DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
              localContext.data[DATA_KEY_PRACTICES][date].push({
                id: newPractice.id,
                duration_seconds: newPractice.duration_seconds  // Add the new practice for this date
              });
          });
        });
      }
      return response;
    }
  );
}
/**
 * Updates a user's practice session with new details and syncs the changes remotely.
 *
 * @param {number} id - The unique identifier of the practice session to update.
 * @param {Object} practiceDetails - The updated details of the practice session.
 * @param {number} [practiceDetails.duration_seconds] - The duration of the practice session in seconds.
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @returns {Promise<Object>} - A promise that resolves to the response from updating the user practice.
 *
 * @example
 * // Update a practice session's duration
 * updateUserPractice(123, { duration_seconds: 600 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Change a practice session to manual and update its category
 * updateUserPractice(456, { auto: false, category_id: 8 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function updateUserPractice(id, practiceDetails) {
  const url = `/api/user/practices/v1/practices/${id}`
  return await fetchHandler(url, 'PUT', null, practiceDetails)
}

/**
 * Removes a user's practice session by ID, updating both the local and remote activity context.
 *
 * @param {number} id - The unique identifier of the practice session to be removed.
 * @returns {Promise<void>} - A promise that resolves once the practice session is removed.
 *
 * @example
 * // Remove a practice session with ID 123
 * removeUserPractice(123)
 *   .then(() => console.log("Practice session removed successfully"))
 *   .catch(error => console.error(error));
 */
export async function removeUserPractice(id) {
  let url = `/api/user/practices/v1/practices${buildQueryString([id])}`;
  await userActivityContext.update(
    async function (localContext) {
      if (localContext.data?.[DATA_KEY_PRACTICES]) {
        Object.keys(localContext.data[DATA_KEY_PRACTICES]).forEach(date => {
          localContext.data[DATA_KEY_PRACTICES][date] = localContext.data[DATA_KEY_PRACTICES][date].filter(
            practice => practice.id !== id
          );
        });
      }
    },
    async function () {
      return await fetchHandler(url, 'delete');
    }
  );
}

/**
 * Restores a previously deleted user's practice session by ID, updating both the local and remote activity context.
 *
 * @param {number} id - The unique identifier of the practice session to be restored.
 * @returns {Promise<Object>} - A promise that resolves to the response containing the restored practice session data.
 *
 * @example
 * // Restore a deleted practice session with ID 123
 * restoreUserPractice(123)
 *   .then(response => console.log("Practice session restored:", response))
 *   .catch(error => console.error(error));
 */
export async function restoreUserPractice(id) {
  let url = `/api/user/practices/v1/practices/restore${buildQueryString([id])}`;
  const response = await fetchHandler(url, 'put');
  if (response?.data) {
    await userActivityContext.updateLocal(async function (localContext) {
      const restoredPractice = response.data;
      const { date } = restoredPractice;
      if (!localContext.data[DATA_KEY_PRACTICES][date]) {
        localContext.data[DATA_KEY_PRACTICES][date] = [];
      }
      localContext.data[DATA_KEY_PRACTICES][date].push({
        id: restoredPractice.id,
        duration_seconds: restoredPractice.duration_seconds,
      });
    });
  }
  return response;
}

export async function deletePracticeSession(day) {
  const userPracticesIds = await getUserPracticeIds(day);
  if (!userPracticesIds.length) return [];

  const url = `/api/user/practices/v1/practices${buildQueryString(userPracticesIds)}`;
  await userActivityContext.update(async function (localContext) {
    if (localContext.data?.[DATA_KEY_PRACTICES]?.[day]) {
      localContext.data[DATA_KEY_PRACTICES][day] = localContext.data[DATA_KEY_PRACTICES][day].filter(
        practice => !userPracticesIds.includes(practice.id)
      );
    }
  });

  return await fetchHandler(url, 'DELETE', null);
}

export async function restorePracticeSession(date) {
  const url = `/api/user/practices/v1/practices/restore?date=${date}`;
  const response = await fetchHandler(url, 'PUT', null);

  if (response?.data) {
    await userActivityContext.updateLocal(async function (localContext) {
      if (!localContext.data[DATA_KEY_PRACTICES][date]) {
        localContext.data[DATA_KEY_PRACTICES][date] = [];
      }

      response.data.forEach(restoredPractice => {
        localContext.data[DATA_KEY_PRACTICES][date].push({
          id: restoredPractice.id,
          duration_seconds: restoredPractice.duration_seconds,
        });
      });
    });
  }

  return response;
}

/**
 * Retrieves and formats a user's practice sessions for a specific day.
 *
 * @param {string} day - The date for which practice sessions should be retrieved (format: YYYY-MM-DD).
 * @returns {Promise<Object>} - A promise that resolves to an object containing the practice sessions and total practice duration.
 *
 * @example
 * // Get practice sessions for a specific day
 * getPracticeSessions("2025-03-31")
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function getPracticeSessions(day) {
  const userPracticesIds = await getUserPracticeIds(day);
  if (!userPracticesIds.length) return { data: { practices: [], practiceDuration: 0 } };

  const meta = await fetchUserPracticeMeta(userPracticesIds);
  if (!meta.data.length) return { data: { practices: [], practiceDuration: 0 } };
  const practiceDuration = meta.data.reduce((total, practice) => total + (practice.duration_seconds || 0), 0);
  const contentIds = meta.data.map(practice => practice.content_id).filter(id => id !== null);

  const contents = await fetchByRailContentIds(contentIds);
  const getFormattedType = (type) => {
    for (const [key, values] of Object.entries(lessonTypesMapping)) {
      if (values.includes(type)) {
        return key.replace(/\b\w/g, char => char.toUpperCase());
      }
    }
    return null;
  };

  const formattedMeta = meta.data.map(practice => {
    const content = contents.find(c => c.id === practice.content_id) || {};
    return {
      id: practice.id,
      auto: practice.auto,
      thumbnail: (practice.content_id)? content.thumbnail : '',
      duration: practice.duration_seconds || 0,
      content_url: content.url || null,
      title: (practice.content_id)? content.title : practice.title,
      category_id: practice.category_id,
      instrument_id: practice.instrument_id ,
      content_type: getFormattedType(content.type || ''),
      content_id: practice.content_id || null,
      content_brand: content.brand || null,
    };
  });
  return { data: { practices: formattedMeta, practiceDuration } };
}


export async function getRecentActivity() {
  return { data: recentActivity };
}

function getStreaksAndMessage(practices) {
  let { currentDailyStreak, currentWeeklyStreak, streakMessage } = calculateStreaks(practices, true);

  return {
    currentDailyStreak,
    currentWeeklyStreak,
    streakMessage,
  };
}


async function getUserPracticeIds(day = new Date().toISOString().split('T')[0]) {
  let data = await userActivityContext.getData();
  let practices = data?.[DATA_KEY_PRACTICES] ?? {};
  let userPracticesIds = [];
  Object.keys(practices).forEach(date => {
    if (date === day) {
      practices[date].forEach(practice => userPracticesIds.push(practice.id));
    }
  });

  return userPracticesIds;
}

function buildQueryString(ids, paramName = 'practice_ids') {
  if (!ids.length) return '';
  return '?' + ids.map(id => `${paramName}[]=${id}`).join('&');
}


// Helper: Get start of the week (Monday)
function getMonday(d) {
  d = new Date(d)
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

// Helper: Get the week number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return  weekNo;
}

// Helper: function to check if two dates are consecutive days
function isNextDay(prev, current) {
  prev = new Date(prev);
  current = new Date(current);
  const diffInMillis = current - prev;
  const diffInDays = diffInMillis / (1000 * 60 * 60 * 24);
  // Check if the difference is exactly 1 day
  return diffInDays === 1;
}


// Helper: Calculate streaks
function calculateStreaks(practices, includeStreakMessage = false) {
  let currentDailyStreak = 0;
  let currentWeeklyStreak = 0;
  let lastActiveDay = null;
  let streakMessage = '';

  let sortedPracticeDays = Object.keys(practices)
    .map(date => new Date(date))
    .sort((a, b) => a - b);

  if (sortedPracticeDays.length === 0) {
    return { currentDailyStreak: 0, currentWeeklyStreak: 0, streakMessage: streakMessages.startStreak };
  }
  lastActiveDay = sortedPracticeDays[sortedPracticeDays.length - 1];

  let dailyStreak = 0;
  let prevDay = null;
  sortedPracticeDays.forEach((currentDay) => {
    if (prevDay === null || isNextDay(prevDay, currentDay)) {
      dailyStreak++;
    } else {
      dailyStreak = 1;
    }
    prevDay = currentDay;
  });
  currentDailyStreak = dailyStreak;

  // Weekly streak calculation
  let weekNumbers = new Set(sortedPracticeDays.map(date => getWeekNumber(date)));
  let weeklyStreak = 0;
  let lastWeek = null;
  [...weekNumbers].sort((a, b) => b - a).forEach(week => {
    if (lastWeek === null || week === lastWeek - 1) {
      weeklyStreak++;
    } else {
      return;
    }
    lastWeek = week;
  });
  currentWeeklyStreak = weeklyStreak;

  // Calculate streak message only if includeStreakMessage is true
  if (includeStreakMessage) {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let currentWeekStart = getMonday(today);
    let lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);

    let hasYesterdayPractice = sortedPracticeDays.some(date =>
      isSameDate(date, yesterday)
    );
    let hasCurrentWeekPractice = sortedPracticeDays.some(date => date >= currentWeekStart);
    let hasCurrentWeekPreviousPractice = sortedPracticeDays.some(date => date >= currentWeekStart && date < today);
    let hasLastWeekPractice = sortedPracticeDays.some(date => date >= lastWeekStart && date < currentWeekStart);
    let hasOlderPractice = sortedPracticeDays.some(date => date < lastWeekStart );

    if (isSameDate(lastActiveDay, today)) {
      if (hasYesterdayPractice) {
        streakMessage = streakMessages.dailyStreak(currentDailyStreak);
      } else if (hasCurrentWeekPreviousPractice) {
        streakMessage = streakMessages.weeklyStreak(currentWeeklyStreak);
      } else if (hasLastWeekPractice) {
        streakMessage = streakMessages.greatJobWeeklyStreak(currentWeeklyStreak);
      } else {
        streakMessage = streakMessages.dailyStreakShort(currentDailyStreak);
      }
    } else {
      if ((hasYesterdayPractice && currentDailyStreak >= 2)  || (hasYesterdayPractice && sortedPracticeDays.length == 1)
        || (hasYesterdayPractice && !hasLastWeekPractice && hasOlderPractice)){
        streakMessage = streakMessages.dailyStreakReminder(currentDailyStreak);
      } else if (hasCurrentWeekPractice) {
        streakMessage = streakMessages.weeklyStreakKeepUp(currentWeeklyStreak);
      } else if (hasLastWeekPractice) {
        streakMessage = streakMessages.weeklyStreakReminder(currentWeeklyStreak);
      } else {
        streakMessage = streakMessages.restartStreak;
      }
    }

  }

  return { currentDailyStreak, currentWeeklyStreak, streakMessage };
}


function isSameDate(date1, date2) {
  // Normalize both dates to midnight to ignore time
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  // Set both dates to 00:00:00 to compare only the date parts
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();  // Compare the time (should be midnight for both)
}







