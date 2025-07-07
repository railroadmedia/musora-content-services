// dateUtils.js

export function convertToTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`);
}
// Get start of the week (Monday)
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Get the week number
export function getWeekNumber(d) {
  let newDate = new Date(d.getTime());
  newDate.setUTCDate(newDate.getUTCDate() + 4 - (newDate.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(newDate.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (newDate - yearStart) / 86400000) + 1)/7);
  return  weekNo;
}
//Check if two dates are the same
export function isSameDate(date1, date2, method = '') {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
}

// Check if two dates are consecutive days
export function isNextDay(prev, current) {
  const prevDate = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
  const nextDate = new Date(prevDate);
  nextDate.setDate(prevDate.getDate() + 1); // Add 1 day

  return (
    nextDate.getFullYear() === current.getFullYear() &&
    nextDate.getMonth() === current.getMonth() &&
    nextDate.getDate() === current.getDate()
  );
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



