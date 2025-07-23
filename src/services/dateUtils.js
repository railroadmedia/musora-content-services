// dateUtils.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter)
dayjs.extend(isoWeek)
dayjs.extend(isBetween)
dayjs.extend(isSameOrBefore)

export function toDayjs(date, timeZone = 'UTC') {
  return dayjs.tz(date, timeZone).startOf('day')
}

export function convertToTimeZone(date, timeZone) {
  return dayjs(date).tz(timeZone).format('YYYY-MM-DD');
}

export function getMonday(date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  // Use isoWeekday(1) - Monday is 1
  return toDayjs(date, timeZone).isoWeekday(1)
}

// Get the ISO week number for a dayjs object
export function getWeekNumber(date) {
  return dayjs(date).isoWeek()
}
//Check if two dates are the same
export function isSameDate(date1, date2) {
  return dayjs(date1).isSame(dayjs(date2), 'day')
}

// Check if two dates are consecutive days
export function isNextDay(date1, date2) {
  const d1 = dayjs(date1).startOf('day')
  const d2 = dayjs(date2).startOf('day')
  return d2.diff(d1, 'day') === 1
}
export function getTimeRemainingUntilLocal(targetUtcIsoString, {withTotalSeconds} = {}) {
  const targetUTC = new Date(targetUtcIsoString);
  if (isNaN(targetUTC.getTime())) {
    return "00:00:00";
  }

  const now = new Date();
  const diff = targetUTC.getTime() - now.getTime();

  if (diff <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  if(withTotalSeconds) {
    return {
      totalSeconds,
      formatted: `${hours}:${minutes}:${seconds}`
    }
  }

  return `${hours}:${minutes}:${seconds}`;
}



