import dayjs from 'dayjs'
import type { ActiveLearningPathResponse } from './active-path'
import type { DailySessionResponse } from './daily-session'

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

const dailySessionPromises = new Map<string, Promise<DailySessionResponse | ''>>()
const activePathPromises = new Map<string, Promise<ActiveLearningPathResponse | ''>>()

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

export function fetchDailySessionOnce(
  brand: string,
  userDate: Date,
  fetcher: () => Promise<DailySessionResponse | ''>,
): Promise<DailySessionResponse | ''> {
  return fetchOnce(dailySessionPromises, dailySessionKey(brand, userDate), fetcher)
}

export function setCachedDailySession(
  brand: string,
  userDate: Date,
  value: DailySessionResponse | null,
): void {
  remember(dailySessionPromises, dailySessionKey(brand, userDate), value)
}

export function invalidateDailySession(brand: string, userDate: Date = new Date()): void {
  dailySessionPromises.delete(dailySessionKey(brand, userDate))
}

export function fetchActivePathOnce(
  brand: string,
  fetcher: () => Promise<ActiveLearningPathResponse | ''>,
): Promise<ActiveLearningPathResponse | ''> {
  return fetchOnce(activePathPromises, activePathKey(brand), fetcher)
}

export function setCachedActivePath(brand: string, value: ActiveLearningPathResponse | null): void {
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
