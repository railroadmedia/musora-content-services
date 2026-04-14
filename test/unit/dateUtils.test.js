import {
  isSameDate,
  convertToTimeZone,
  getMonday,
  getWeekNumber,
  isNextDay,
  getTimeRemainingUntilLocal,
  getToday,
} from '../../src/services/dateUtils.js'

const mockTimezone = (tz) => {
  const RealDateTimeFormat = Intl.DateTimeFormat
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
    const instance = new RealDateTimeFormat(...args)
    return {
      format: instance.format.bind(instance),
      formatToParts: instance.formatToParts.bind(instance),
      resolvedOptions: () => ({ ...instance.resolvedOptions(), timeZone: tz }),
    }
  })
}

describe('isSameDate', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('basic comparisons', () => {
    test('returns true for identical YYYY-MM-DD strings', () => {
      expect(isSameDate('2024-01-07', '2024-01-07')).toBe(true)
    })

    test('returns false for different YYYY-MM-DD strings', () => {
      expect(isSameDate('2024-01-07', '2024-01-08')).toBe(false)
    })

    test('returns true for two ISO strings at different times on the same local day', () => {
      expect(isSameDate('2024-01-07T08:00:00', '2024-01-07T23:00:00')).toBe(true)
    })
  })

  describe('UTC offset edge cases', () => {
    test('matches a local ISO string with a bare date string in UTC-6 at 6pm (the reported bug)', () => {
      mockTimezone('America/Chicago') // UTC-6 in January
      // 6pm Sunday local in UTC-6 = midnight UTC Monday — the old dayjs("YYYY-MM-DD") parsed
      // bare dates as UTC midnight, resolving to 6pm Saturday locally and failing the match.
      expect(isSameDate('2024-01-07T18:00:00-06:00', '2024-01-07')).toBe(true)
    })

    test('matches a UTC midnight string to the correct prior local date in UTC-6', () => {
      mockTimezone('America/Chicago') // UTC-6 in January
      // 2024-01-08T00:00:00Z is the same instant as 2024-01-07T18:00:00-06:00 (Sunday 6pm local)
      expect(isSameDate('2024-01-08T00:00:00Z', '2024-01-07')).toBe(true)
    })

    test('returns false when UTC midnight maps to the next local day in UTC-6', () => {
      mockTimezone('America/Chicago')
      // 2024-01-08T00:00:00Z = Sunday 6pm local (Jan 7), not Jan 8 locally
      expect(isSameDate('2024-01-08T00:00:00Z', '2024-01-08')).toBe(false)
    })

    test('matches correctly in a positive UTC offset timezone (UTC+10)', () => {
      mockTimezone('Australia/Sydney') // UTC+10 in January (AEST, no DST)
      // 6pm Sunday local in UTC+10 = 8am Sunday UTC — no day boundary issue
      expect(isSameDate('2024-01-07T18:00:00+10:00', '2024-01-07')).toBe(true)
    })

    test('returns false for genuinely different local dates regardless of timezone', () => {
      mockTimezone('America/Chicago')
      expect(isSameDate('2024-01-07T18:00:00-06:00', '2024-01-08')).toBe(false)
    })
  })
})

describe('convertToTimeZone', () => {
  test('returns YYYY-MM-DD string in the target timezone', () => {
    expect(convertToTimeZone('2024-01-07T12:00:00Z', 'America/Chicago')).toBe('2024-01-07')
  })

  test('returns the prior calendar date when UTC midnight crosses a day boundary in UTC-6', () => {
    // 2024-01-08T00:00:00Z = Jan 7 18:00 in Chicago
    expect(convertToTimeZone('2024-01-08T00:00:00Z', 'America/Chicago')).toBe('2024-01-07')
  })

  test('returns the next calendar date when UTC afternoon crosses a day boundary in UTC+9', () => {
    // 2024-01-07T16:00:00Z = Jan 8 01:00 in Tokyo (UTC+9)
    expect(convertToTimeZone('2024-01-07T16:00:00Z', 'Asia/Tokyo')).toBe('2024-01-08')
  })
})

describe('getMonday', () => {
  test('returns Monday of the same week for a Wednesday', () => {
    // 2024-01-10 is a Wednesday; Monday of that week is Jan 8
    expect(getMonday('2024-01-10', 'UTC').format('YYYY-MM-DD')).toBe('2024-01-08')
  })

  test('returns the same date when the input is already a Monday', () => {
    expect(getMonday('2024-01-08', 'UTC').format('YYYY-MM-DD')).toBe('2024-01-08')
  })

  test('returns the prior Monday for a Sunday (ISO weeks start on Monday)', () => {
    // 2024-01-07 is a Sunday; the ISO Monday of that week is Jan 1
    expect(getMonday('2024-01-07', 'UTC').format('YYYY-MM-DD')).toBe('2024-01-01')
  })
})

describe('getWeekNumber', () => {
  test('returns 1 for the first ISO week of the year', () => {
    expect(getWeekNumber('2024-01-01')).toBe(1)
  })

  test('returns 2 for the second ISO week', () => {
    // 2024-01-08 is the first day of week 2
    expect(getWeekNumber('2024-01-08')).toBe(2)
  })
})

describe('isNextDay', () => {
  test('returns true when date2 is exactly one day after date1', () => {
    expect(isNextDay('2024-01-07', '2024-01-08')).toBe(true)
  })

  test('returns false for the same date', () => {
    expect(isNextDay('2024-01-07', '2024-01-07')).toBe(false)
  })

  test('returns false when date2 is two days after date1', () => {
    expect(isNextDay('2024-01-07', '2024-01-09')).toBe(false)
  })

  test('returns false when date2 is before date1', () => {
    expect(isNextDay('2024-01-08', '2024-01-07')).toBe(false)
  })
})

describe('getTimeRemainingUntilLocal', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-07T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('returns formatted HH:MM:SS for a future target', () => {
    // 1 hour 30 minutes 45 seconds in the future
    expect(getTimeRemainingUntilLocal('2024-01-07T13:30:45Z')).toBe('01:30:45')
  })

  test('returns formatted string with zero-padded single-digit values', () => {
    expect(getTimeRemainingUntilLocal('2024-01-07T12:05:09Z')).toBe('00:05:09')
  })

  test('returns "00:00:00" for a past target', () => {
    expect(getTimeRemainingUntilLocal('2024-01-07T11:00:00Z')).toBe('00:00:00')
  })

  test('returns "00:00:00" for an invalid date string', () => {
    expect(getTimeRemainingUntilLocal('not-a-date')).toBe('00:00:00')
  })

  test('returns object with totalSeconds and formatted when withTotalSeconds is true', () => {
    // 1 hour 30 minutes 45 seconds = 5445 seconds
    expect(getTimeRemainingUntilLocal('2024-01-07T13:30:45Z', { withTotalSeconds: true })).toEqual({
      totalSeconds: 5445,
      formatted: '01:30:45',
    })
  })

  test('handles targets more than 24 hours away', () => {
    expect(getTimeRemainingUntilLocal('2024-01-08T14:00:00Z')).toBe('26:00:00')
  })
})

describe('getToday', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  test('returns start of today in the local timezone', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-08T00:00:00Z'))
    mockTimezone('America/Chicago') // UTC-6: Jan 8 00:00 UTC = Jan 7 18:00 Chicago
    expect(getToday().format('YYYY-MM-DD')).toBe('2024-01-07')
  })
})
