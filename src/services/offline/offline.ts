import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import { _recordWatchSession } from '../contentProgress.js'
import { CollectionParameter } from '../sync/models/ContentProgress'

export const RECORD_OFFLINE_STATUS = ['created', 'updated']

interface HierarchyParameter {
  topLevelId: number
  parents: { [contentId: number]: [parentId: number] }
  children: { [contentId: number]: [childId: number] }
  metadata: {
    brand: string
    parent_id: number
    type: string
  }
}

////////////////////////
////       USER ACTIVITY
////////////////////////

export async function getRecentActivityOffline({ page = 1, limit = 5, tabName = null } = {}): Promise<any> {
  // refactor this to RADFOP

  // do we allow lessons or songs tab? for sure allow ALL tab.

  // get all offline content progress, sorted by created_at, grab ALL, for purposes of pagination.
  // explode into started and completed actions based on created_at and updated_at (with status).
  // iterate through and create list of RADFOP
  // store total count and current page.
  // apply limit -> data.

  return {
    currentPage: result.currentPage,
    totalPages: result.totalPages,
    data: result.data,
  }
}

// as we are only supporting RADFOP, there's no offline activity write function


////////////////////////
////           PRACTICES
////////////////////////

export async function getOwnPracticesOffline(...clauses: Q.Clause[]) {
  clauses.push(Q.where('_status', Q.oneOf(RECORD_OFFLINE_STATUS)))
  const results = await db.practices.queryAll(...clauses)
  const data = results.data.reduce((acc, practice) => {
    acc[practice.date] = acc[practice.date] || []
    acc[practice.date].push({
      id: practice.id,
      duration_seconds: Math.round(practice.duration_seconds),
    })
    return acc
  }, {})

  return data
}


////////////////////////
////    CONTENT PROGRESS
////////////////////////

// progress read endpoints

export async function recordWatchSessionOffline(
  contentId: number,
  mediaLengthSeconds: number,
  currentSeconds: number,
  secondsPlayed: number,
  hierarchy: HierarchyParameter,
  {
    collection = null,
    prevSession = null,
    instrumentId = null,
    categoryId = null,
  }: {
    collection: CollectionParameter|null,
    prevSession: string|null,
    instrumentId: number|null,
    categoryId: number|null
  }
) {
  return _recordWatchSession(
    contentId,
    mediaLengthSeconds,
    currentSeconds,
    secondsPlayed,
    {
      collection,
      prevSession,
      instrumentId,
      categoryId,
      hierarchy,
    })
}
