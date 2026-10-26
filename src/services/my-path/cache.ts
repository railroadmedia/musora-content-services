import dayjs from 'dayjs'
import type { ActivePathResponse } from './active-path'

const excludeFromGeneratedIndex = [
  'formatLocalDate',
  'fetchDailySessionOnce',
  'setCachedDailySession',
  'invalidateDailySession',
  'fetchActivePathOnce',
  'fetchLinearizedPathOnce',
  'setCachedActivePath',
  'invalidateActivePath',
  'clearLearningPathCaches',
]

const ACTIVE_PATH_FIELDS = [
  'user_id',
  'brand',
  'active_learning_path_id',
  'active_node_id',
  'active_learning_path_created_at',
] as const

const DAILY_SESSION_FIELDS = [...ACTIVE_PATH_FIELDS, 'daily_session', 'user_date'] as const

const LINEARIZED_PATH_FIELDS = ['linearized_learning_paths'] as const

type ActivePathSource = Partial<Omit<ActivePathResponse, 'active_learning_path_created_at'>> & {
  active_learning_path_created_at?: number | string
}

type DailySessionSource = ActivePathSource & {
  daily_session?: unknown[]
  user_date?: string
}

const MAX_TTL = 3600 * 1000 // 1 hour

interface CacheEntry<T> {
  promise: Promise<T>
  expiresAt: number
}

const dailySessionPromises = new Map<string, CacheEntry<any>>()
const activePathPromises = new Map<string, CacheEntry<any>>()
const linearizedPathPromises = new Map<string, CacheEntry<any>>()

export function formatLocalDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD Z')
}

function linearizedPathKey(brand: string): string {
  return `linearized-path:${brand}`
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
  return fetchOnce(dailySessionPromises, key, expiresAt, fetcher, DAILY_SESSION_FIELDS)
}

export function fetchActivePathOnce<T>(
  brand: string,
  fetcher: () => Promise<T | ''>,
): Promise<T | ''> {
  const key = activePathKey(brand)
  const expiresAt = determineCacheExpiry()
  return fetchOnce(activePathPromises, key, expiresAt, fetcher, ACTIVE_PATH_FIELDS)
}

export function fetchLinearizedPathOnce<T>(
  brand: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const key = linearizedPathKey(brand)
  const expiresAt = determineCacheExpiry()
  return fetchOnce(linearizedPathPromises, key, expiresAt, fetcher, LINEARIZED_PATH_FIELDS)
}

function snapshot<T>(value: T, fields: readonly string[]): T {
  if (value === null || typeof value !== 'object') return value

  const picked: Record<string, unknown> = {}
  for (const field of fields) {
    if ((value as Record<string, unknown>)[field] !== undefined) {
      picked[field] = (value as Record<string, unknown>)[field]
    }
  }
  return JSON.parse(JSON.stringify(picked)) as T
}

function fetchOnce<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  expiresAt: number,
  fetcher: () => Promise<T>,
  fields: readonly string[],
): Promise<T> {
  const existing = cache.get(key)
  if (existing && existing.expiresAt > Date.now()) {
    return existing.promise
  }

  const promise = fetcher().then((value) => snapshot(value, fields))
  const entry = { promise, expiresAt }
  cache.set(key, entry)
  promise.catch(() => {
    if (cache.get(key) === entry) cache.delete(key)
  })
  return promise
}

function remember<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  expiresAt: number,
  value: T | null,
  fields: readonly string[],
): void {
  if (value === null) {
    cache.delete(key)
  } else {
    cache.set(key, { promise: Promise.resolve(snapshot(value, fields)), expiresAt })
  }
}

export function setCachedDailySession(brand: string, userDate: Date, value: DailySessionSource | null): void {
  const key = dailySessionKey(brand, userDate)
  const expiresAt = determineCacheExpiry(userDate)
  remember(dailySessionPromises, key, expiresAt, value, DAILY_SESSION_FIELDS)
}

export function setCachedActivePath(brand: string, value: ActivePathSource | null): void {
  const key = activePathKey(brand)
  const expiresAt = determineCacheExpiry()
  remember(activePathPromises, key, expiresAt, value, ACTIVE_PATH_FIELDS)
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
  linearizedPathPromises.clear()
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
