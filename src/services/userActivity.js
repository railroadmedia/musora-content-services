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

export let userActivityContext = new DataContext(UserActivityVersionKey, fetchUserPractices)

// Get Weekly Stats
export async function getUserWeeklyStats() {
  let data = await userActivityContext.getData()

  let practices = data?.[DATA_KEY_PRACTICES] ?? {}

  let today = new Date()
  let startOfWeek = getMonday(today) // Get last Monday
  let dailyStats = []
  const todayKey = today.toISOString().split('T')[0]
  for (let i = 0; i < 7; i++) {
    let day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    let dayKey = day.toISOString().split('T')[0]

    let dayActivity = practices[dayKey] ?? null
    let isActive = dayKey === todayKey
    let type = (dayActivity !== null ? 'tracked' : (isActive ? 'active' : 'none'))
    dailyStats.push({ key: i, label: DAYS[i], isActive, inStreak: dayActivity !== null, type })
  }

  let { streakMessage } = getStreaksAndMessage(practices);

  return { data: { dailyActiveStats: dailyStats, streakMessage } }
}

export async function getUserMonthlyStats(year = new Date().getFullYear(), month = new Date().getMonth(), day = 1) {
  let data = await userActivityContext.getData()
  let practices = data?.[DATA_KEY_PRACTICES] ?? {}
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
    let dayKey = day.toISOString().split('T')[0]

    // Check if the user has activity for the day, default to 0 if undefined
    let dayActivity = practices[dayKey] ?? null
    let weekKey = getWeekNumber(day)

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { key: weekKey, inStreak: false };
    }

    if (dayActivity) {
      practiceDuration += dayActivity.reduce((sum, entry) => sum + entry.duration_seconds, 0)
      daysPracticed++;
    }
    let isActive = dayKey === today.toISOString().split('T')[0]
    let type = (dayActivity !== null ? 'tracked' : (isActive ? 'active' : 'none'))

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

export async function updateUserPractice(id, practiceDetails) {
  const url = `/api/user/practices/v1/practices/${id}`
  return await fetchHandler(url, 'PUT', null, practiceDetails)
}

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
  return await fetchHandler(url, 'delete', null);
}

export async function restorePracticeSession(date) {
  const url = `/api/user/practices/v1/practices/restore?date=${date}`;
  return await fetchHandler(url, 'put', null);
}

export async function getPracticeSessions(day) {
  const userPracticesIds = await getUserPracticeIds(day);
  if (!userPracticesIds.length) return { data: { practices: [], practiceDuration: 0 } };

  const meta = await fetchUserPracticeMeta(userPracticesIds);
  const practiceDuration = meta.reduce((total, practice) => total + (practice.duration_seconds || 0), 0);
  const contentIds = meta.map(practice => practice.content_id).filter(id => id !== null);

  const contents = await fetchByRailContentIds(contentIds);
  const getFormattedType = (type) => {
    for (const [key, values] of Object.entries(lessonTypesMapping)) {
      if (values.includes(type)) {
        return key.replace(/\b\w/g, char => char.toUpperCase());
      }
    }
    return null;
  };

  const formattedMeta = meta.map(practice => {
    const content = contents.find(c => c.id === practice.content_id) || {};
    return {
      id: practice.id,
      auto: practice.auto,
      thumbnail: (practice.content_id)? content.thumbnail : '',
      duration: practice.duration_seconds || 0,
      content_url: content.url || null,
      title: (practice.content_id)? content.title : practice.title,
      category_id: practice.category_id || null,
      instrument_id: practice.instrument_id || null,
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

function getStreaksAndMessage(practices)
{
  let { currentDailyStreak, currentWeeklyStreak } = calculateStreaks(practices)

  let streakMessage = currentWeeklyStreak > 1
    ? `That's ${currentWeeklyStreak} weeks in a row! Keep going!`
    : `Nice! You have a ${currentDailyStreak} day streak! Way to keep it going!`
  return {
    currentDailyStreak,
    currentWeeklyStreak,
    streakMessage,
  }
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
function getWeekNumber(date) {
  let startOfYear = new Date(date.getFullYear(), 0, 1)
  let diff = date - startOfYear
  let oneWeekMs = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeekMs) + startOfYear.getDay() / 7)
}

// Helper: function to check if two dates are consecutive days
function isNextDay(prevDateStr, currentDateStr) {
  let prevDate = new Date(prevDateStr)
  let currentDate = new Date(currentDateStr)
  let diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24)
  return diff === 1
}

// Helper: Calculate streaks
function calculateStreaks(practices) {
  let currentDailyStreak = 0
  let currentWeeklyStreak = 0

  let sortedPracticeDays = Object.keys(practices).sort() // Ensure dates are sorted in order

  if (sortedPracticeDays.length === 0) {
    return { currentDailyStreak: 1, currentWeeklyStreak: 1 }
  }

  let dailyStreak = 0
  let longestDailyStreak = 0
  let prevDay = null

  sortedPracticeDays.forEach((dayKey) => {
    if (prevDay === null || isNextDay(prevDay, dayKey)) {
      dailyStreak++
      longestDailyStreak = Math.max(longestDailyStreak, dailyStreak)
    } else {
      dailyStreak = 1 // Reset streak if there's a gap
    }
    prevDay = dayKey
  })

  currentDailyStreak = dailyStreak

  // Calculate weekly streaks
  let weeklyStreak = 0
  let prevWeek = null
  let currentWeekActivity = false

  sortedPracticeDays.forEach((dayKey) => {
    let date = new Date(dayKey)
    let weekNumber = getWeekNumber(date)

    if (prevWeek === null) {
      prevWeek = weekNumber
      currentWeekActivity = true
    } else if (weekNumber !== prevWeek) {
      // A new week has started
      if (currentWeekActivity) {
        weeklyStreak++
        currentWeekActivity = false
      }
      prevWeek = weekNumber
    }

    if (practices[dayKey]) {
      currentWeekActivity = true
    }
  })

  // If the user has activity in the current week, count it
  if (currentWeekActivity) {
    weeklyStreak++
  }

  currentWeeklyStreak = weeklyStreak

  return { currentDailyStreak, currentWeeklyStreak }
}





