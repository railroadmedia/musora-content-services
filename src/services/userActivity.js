/**
 * @module User-Activity
 */

import {fetchUserPractices, logUserPractice, fetchUserPracticeMeta, fetchHandler} from './railcontent'
import { DataContext, UserActivityVersionKey } from './dataContext.js'
import {fetchByRailContentIds} from "./sanity";
import {TabResponseType} from "../contentMetaData";

//TODO: remove harcoded data when the PR is approved
const userActivityStats = {
  dailyActiveStats: [
    { label: 'M', isActive: false, inStreak: false, type: 'none' },
    { label: 'T', isActive: false, inStreak: false, type: 'none' },
    { label: 'W', isActive: true, inStreak: true, type: 'tracked' },
    { label: 'T', isActive: true, inStreak: true, type: 'tracked' },
    { label: 'F', isActive: false, inStreak: false, type: 'none' },
    { label: 'S', isActive: true, inStreak: false, type: 'active' },
    { label: 'S', isActive: false, inStreak: false, type: 'none' },
  ],
  currentDailyStreak: 3,
  currentWeeklyStreak: 2,
  streakMessage: 'That\'s 8 weeks in a row! Way to keep your streak going.',
}
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

//TODO: remove the method when the PR is approved
export async function getUserActivityStats(brand) {
  return userActivityStats
}

export let userActivityContext = new DataContext(UserActivityVersionKey, fetchUserPractices)

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

  return {
    dailyActiveStats: dailyStats,
    streakMessage
  }
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

  return {
    dailyActiveStats: dailyStats,
    weeklyActiveStats: Object.values(weeklyStats),
    practiceDuration,
    currentDailyStreak,
    currentWeeklyStreak,
    daysPracticed,
  }
}

export async function getUserPractices() {
  let data = await userActivityContext.getData()
  return data?.[DATA_KEY_PRACTICES] ?? []
}

export async function recordUserPractice(practiceDetails) {
  practiceDetails.auto = 0;
  if (practiceDetails.content_id) {
    const content = await fetchByRailContentIds([practiceDetails.content_id]);
    practiceDetails.auto = 1;
    practiceDetails.title = content[0].title;
    practiceDetails.thumbnail_url = content[0].thumbnail;
  }

  const today = new Date().toISOString().split("T")[0];
  await userActivityContext.update(
    async function (localContext) {
      let userData = localContext.data ?? { [DATA_KEY_PRACTICES]: {} };

      if (!userData[DATA_KEY_PRACTICES][today]) {
        userData[DATA_KEY_PRACTICES][today] = [];
      }
      localContext.data = userData;
    },
    async function () {
      const response = await logUserPractice(practiceDetails);
      if (response) {
        await userActivityContext.updateLocal(async function (localContext) {
          const newPractices = response.data ?? []
          newPractices.forEach(newPractice => {
            const { date } = newPractice;
            if (localContext.data[DATA_KEY_PRACTICES][date]) {
              console.log('rox data exists before push ::::: ', localContext.data[DATA_KEY_PRACTICES][date], newPractice, date)
              localContext.data[DATA_KEY_PRACTICES][date].push({
                id: newPractice.id,
                duration_seconds: newPractice.duration_seconds  // Add the new practice for this date
              });
              console.log('rox data exists after push ::::: ', localContext.data, newPractice)
            } else {
              console.log('rox data not exists before push ::::: ',  newPractice)
              localContext.data[DATA_KEY_PRACTICES][date].push({
                id: newPractice.id,
                duration_seconds: newPractice.duration_seconds  // Add the new practice for this date
              });
            }
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
  let url = `/api/user/practices/v1/practices/${id}`
  return await fetchHandler(url, 'delete')
}

export async function getPracticeSessions(day = new Date().toISOString().split('T')[0]) {
  let data = await userActivityContext.getData();
  let practices = data?.[DATA_KEY_PRACTICES] ?? {};

  let userPracticesIds = [];
  Object.keys(practices).forEach(date => {
    console.log('rox compare date day ::::: ', date, day  )
    if (date === day) {
      practices[date].forEach(practice => {
        userPracticesIds.push(practice.id);
      });
    }
  });

  const meta =  await fetchUserPracticeMeta(userPracticesIds);
  let practiceDuration = meta.reduce((total, practice) => total + (practice.duration_seconds || 0), 0);

  const formattedMeta = meta.map(practice => ({
    auto: practice.auto,
    thumbnail: practice.thumbnail_url || '',
    duration: practice.duration_seconds || 0,
    url: practice.url || '',
    title: practice.title || '',
    category_id: practice.category_id || null,
    instrument: practice.instrument || 'Pianote',
    type: practice.type || 'Single',
  }));
  console.log('rox getPracticeSessions ::::: ', {
    data: {practices:formattedMeta, practiceDuration}
  })
  return {
    data: {practices:formattedMeta,
      practiceDuration}
  };
}

export async function getRecentActivity() {
  return recentActivity;
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





