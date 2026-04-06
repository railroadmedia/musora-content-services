import { Q } from '@nozbe/watermelondb'
import SyncRepository from './base'
import UserActivity, { ACTIVITY_TAB } from '../models/UserActivity'
import { RECORD_OFFLINE_STATUS } from '../../offline/offline'

export interface UserActivityRecordPayload {
  content_id?: number | null
  action: string
  brand: string
  type: string
  date: number
  summary?: string | null
  post_id?: number | null
  comment_id?: number | null
}

interface TabCountResponse {
  [key: string]: number
}

export default class UserActivitiesRepository extends SyncRepository<UserActivity> {
  async getPage(page: number, limit: number, {tabName = null, offline = false}: {tabName?: string|null, offline?: boolean} = {}) {
    const filterClauses: Q.Clause[] = []

    if (offline) {
      filterClauses.push(Q.where('_status', Q.oneOf(RECORD_OFFLINE_STATUS)))
    }

    if (tabName) {
      const tabFilter = this.filterByTab(tabName)
      if (tabFilter) {
        filterClauses.push(tabFilter)
      }
    }

    // quasi-pagination
    const totalCount = await this.store.collection.query(...filterClauses).fetchCount()
    const totalPages = Math.ceil(totalCount / limit)

    const result = await this.queryAll(
      ...filterClauses,
      Q.sortBy('date', Q.desc),
      Q.skip((page - 1) * limit),
      Q.take(limit)
    )

    return { ...result, currentPage: page, totalPages }
  }

  async record(payload: UserActivityRecordPayload) {
    return this.insertOne(r => { // no upserts.
      r.content_id = payload.content_id
      r.action = payload.action
      r.brand = payload.brand
      r.type = payload.type
      r.date = payload.date
      r.summary = payload.summary
      r.post_id = payload.post_id
      r.comment_id = payload.comment_id
    })
  }

  async recordAuto

  private filterByTab(tabName: string) {
    const tabValue = this.getTabValueFromName(tabName)

    const value = tabValue === ACTIVITY_TAB.ALL ? null : tabValue

    if (value === null) {
      return null
    }

    return tabValue === ACTIVITY_TAB.COMMENTS
      ? Q.where('action', value)
      : Q.and(
        Q.where('type', value),
        Q.where('action', Q.notEq(ACTIVITY_TAB.COMMENTS))
      )
  }

  async tabs() {
    const counts = await this.getTabCounts() as TabCountResponse[]

    let response = [
      {
        key: ACTIVITY_TAB.ALL as string,
        label: this.getTabNameFromValue(ACTIVITY_TAB.ALL),
      }
    ]
    counts.forEach(item => {
      const [[type, count]] = Object.entries(item)

      if (type !== ACTIVITY_TAB.ALL && count > 0) {
        response.push({
          key: type,
          label: this.getTabNameFromValue(type),
        })
      }
    })

    return response
  }

  private async getTabCounts() {
    const types = [ACTIVITY_TAB.LESSONS, ACTIVITY_TAB.SONGS, ACTIVITY_TAB.POSTS]

    return Promise.all([
      this.store.collection.query(Q.where('action', ACTIVITY_TAB.COMMENTS)).fetchCount()
        .then(count => ({ [ACTIVITY_TAB.COMMENTS]: count })),
      ...types.map(
        type => this.store.collection.query(
          Q.where('type', type),
          Q.where('action', Q.notEq(ACTIVITY_TAB.COMMENTS))
        ).fetchCount()
          .then(count => ({ [type]: count }))
      ),
    ]) as Promise<TabCountResponse[]>
  }

  // input singular lowercase tab
  private getTabNameFromValue(tabValue: string) {
    const tabName = tabValue.charAt(0).toUpperCase() + tabValue.slice(1)
    return (tabValue === ACTIVITY_TAB.ALL) ? tabName : `${tabName}s`
  }


  // input capitalized plural tab
  private getTabValueFromName(tabName: string) {
    const tabValue = tabName.toLowerCase()
    return (tabValue === ACTIVITY_TAB.ALL) ? tabValue : tabValue.replace(/s$/, '') as ACTIVITY_TAB
  }
}
