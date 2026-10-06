import dayjs from 'dayjs'

const excludeFromGeneratedIndex = [
  'formatLocalDate',
  'fetchDailySessionOnce',
  'setCachedDailySession',
  'invalidateDailySession',
  'fetchActivePathOnce',
  'setCachedActivePath',
  'invalidateActivePath',
  'clearLearningPathCaches',
]

const MAX_TTL = 3600 * 1000 // 1 hour

interface CacheEntry<T> {
  promise: Promise<T>
  expiresAt: number
}

const dailySessionPromises = new Map<string, CacheEntry<any>>()
const activePathPromises = new Map<string, CacheEntry<any>>()

export function formatLocalDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD Z')
}

function activePathKey(brand: string): string {
  return `active-path:${brand}`
}

function dailySessionKey(brand: string, userDate: Date): string {
  const day = formatLocalDate(userDate)
  return `daily-session:${brand}:${day}`
}

export function fetchDailySessionOnce<T>(
  brand: string,
  userDate: Date,
  fetcher: () => Promise<T | ''>,
): Promise<T | ''> {
  const key = dailySessionKey(brand, userDate)
  const expiresAt = determineCacheExpiry(userDate)
  return fetchOnce(dailySessionPromises, key, expiresAt, fetcher)
}

export function fetchActivePathOnce<T>(
  brand: string,
  fetcher: () => Promise<T | ''>,
): Promise<T | ''> {
  const key = activePathKey(brand)
  const expiresAt = determineCacheExpiry()
  return fetchOnce(activePathPromises, key, expiresAt, fetcher)
}

function fetchOnce<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  expiresAt: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key)
  if (existing && existing.expiresAt > Date.now()) {
    return existing.promise
  }

  const promise = fetcher()
  const entry = { promise, expiresAt }
  cache.set(key, entry)
  promise
    .then((value) => {
      if (!value && cache.get(key) === entry) cache.delete(key)
    })
    .catch(() => {
      if (cache.get(key) === entry) cache.delete(key)
    })
  return promise
}

function remember<T>(cache: Map<string, CacheEntry<T>>, key: string, expiresAt: number, value: T | null): void {
  if (value === null) {
    cache.delete(key)
  } else {
    cache.set(key, { promise: Promise.resolve(value), expiresAt })
  }
}

export function setCachedDailySession<T>(brand: string, userDate: Date, value: T | null): void {
  const key = dailySessionKey(brand, userDate)
  const expiresAt = determineCacheExpiry(userDate)
  remember(dailySessionPromises, key, expiresAt, value)
}

export function setCachedActivePath<T>(brand: string, value: T | null): void {
  const key = activePathKey(brand)
  const expiresAt = determineCacheExpiry()
  remember(activePathPromises, key, expiresAt, value)
}

export function invalidateDailySession(brand: string, userDate: Date = new Date()): void {
  const key = dailySessionKey(brand, userDate)
  dailySessionPromises.delete(key)
}

export function invalidateActivePath(brand: string): void {
  const key = activePathKey(brand)
  activePathPromises.delete(key)
}

export function clearLearningPathCaches(): void {
  dailySessionPromises.clear()
  activePathPromises.clear()
}

function determineCacheExpiry(userDate?: Date): number {
  const maxTTLTime = Date.now() + MAX_TTL
  if (!userDate) return maxTTLTime

  const localMidnight = new Date(userDate)
  localMidnight.setDate(localMidnight.getDate() + 1)
  localMidnight.setHours(0, 0, 1, 0)
  const midnightTime = localMidnight.getTime()

  if (midnightTime <= Date.now()) return maxTTLTime
  return Math.min(midnightTime, maxTTLTime)
}
