import { db } from '../sync'
import { ProgressQueryOptions, StartedOrCompletedOptions } from './types'

const SIXTY_DAYS_IN_SECONDS = 60 * 24 * 60 * 60

const defaultQueryOptions: ProgressQueryOptions = {
  onlyIds: true,
  include: {
    aLaCarte: true,
    learningPaths: false,
  },
}

export const allStarted = async (limit: number | null = null, options?: ProgressQueryOptions) =>
  db.contentProgress.started(limit, options ?? defaultQueryOptions)

export const allCompleted = async (limit: number | null = null, options?: ProgressQueryOptions) =>
  db.contentProgress.completed(limit, options ?? defaultQueryOptions)

export const allCompletedByIds = async (contentIds: number[]) =>
  db.contentProgress.completedByContentIds(contentIds)

export const allStartedOrCompleted = async (
  limit?: number,
  options: StartedOrCompletedOptions = {}
) =>
  db.contentProgress
    .startedOrCompleted({
      ...options,
      limit,
      updatedAfter: Math.floor(Date.now() / 1000) - SIXTY_DAYS_IN_SECONDS,
    })
    .then((r) => r.data)
