import dayjs from 'dayjs'

const excludeFromGeneratedIndex = [
  'formatLocalDateTime',
  'fetchDailySessionOnce',
  'setCachedDailySession',
  'invalidateDailySession',
  'fetchActivePathOnce',
  'setCachedActivePath',
  'invalidateActivePath',
  'clearLearningPathCaches',
  'resetLearningPathCachesForTests',
]

const dailySessionPromises = new Map<string, Promise<any>>()
const activePathPromises = new Map<string, Promise<any>>()

export function formatLocalDateTime(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD Z')
}

function activePathKey(brand: string): string {
  return `active-path:${brand}`
}

function dailySessionKey(brand: string, userDate: Date): string {
  return `daily-session:${brand}:${formatLocalDateTime(userDate)}`
}

function fetchOnce<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key)!
  }

  const promise = fetcher()
  cache.set(key, promise)
  promise
    .then((value) => {
      if (!value && cache.get(key) === promise) cache.delete(key)
    })
    .catch(() => {
      if (cache.get(key) === promise) cache.delete(key)
    })
  return promise
}

function remember<T>(cache: Map<string, Promise<T>>, key: string, value: T | null): void {
  if (value === null) {
    cache.delete(key)
  } else {
    cache.set(key, Promise.resolve(value))
  }
}

export function fetchDailySessionOnce<T>(
  brand: string,
  userDate: Date,
  fetcher: () => Promise<T | ''>,
): Promise<T | ''> {
  return fetchOnce(dailySessionPromises, dailySessionKey(brand, userDate), fetcher)
}

export function setCachedDailySession<T>(brand: string, userDate: Date, value: T | null): void {
  remember(dailySessionPromises, dailySessionKey(brand, userDate), value)
}

export function invalidateDailySession(brand: string, userDate: Date = new Date()): void {
  dailySessionPromises.delete(dailySessionKey(brand, userDate))
}

export function fetchActivePathOnce<T>(
  brand: string,
  fetcher: () => Promise<T | ''>,
): Promise<T | ''> {
  return fetchOnce(activePathPromises, activePathKey(brand), fetcher)
}

export function setCachedActivePath<T>(brand: string, value: T | null): void {
  remember(activePathPromises, activePathKey(brand), value)
}

export function invalidateActivePath(brand: string): void {
  activePathPromises.delete(activePathKey(brand))
}

export function clearLearningPathCaches(): void {
  dailySessionPromises.clear()
  activePathPromises.clear()
}

export function resetLearningPathCachesForTests(): void {
  clearLearningPathCaches()
}
