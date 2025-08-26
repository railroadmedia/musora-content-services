import { RecordId } from "@nozbe/watermelondb"
import SyncStoreOrchestrator from "./orchestrator"
import SyncStore from "./store"
import { type DatabaseAdapter } from "./adapters/factory"
import { Database } from "@nozbe/watermelondb"

export type SyncContext = {
  adapter: DatabaseAdapter
  databases: Database[]
  stores: Record<string, SyncStore>
  orchestrator: SyncStoreOrchestrator
}

export type SyncToken = string
export type SyncSyncable = { id: RecordId } & Record<string, any>

export type SyncPullEntry = SyncEntry
export type SyncPushEntry = SyncEntry
export type SyncEntry = {
  record: SyncSyncable
  meta: {
    record_id: RecordId
    lifecycle: SyncEntryLifecycle
  }
}

type SyncEntryLifecycle = {
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SyncStorePullMultiDTO = SyncStorePullDTO<SyncSyncable[]>
export type SyncStorePullSingleDTO = SyncStorePullDTO<SyncSyncable>
export type SyncStorePullDTO<T = SyncSyncable | SyncSyncable[]> = {
  success: true
  data: T
  status: 'fresh' | 'possiblyStale'
  previousFetchToken: SyncToken | null
  fetchToken: SyncToken
}

export type SyncStorePushDTO<T = SyncSyncable> = {
  data: T
  state: 'synced' // | 'queued'
  // status: 'accepted' // | 'refused' | 'unreachable'
}

export type SyncStorePushResponse = SyncStorePushResponseUnreachable | SyncStorePushResponseAcknowledged

export type SyncStorePushResponseUnreachable = SyncStorePushResponseBase & {
  acknowledged: false
  status: 'unreachable'
  originalError: Error
}
export type SyncStorePushResponseAcknowledged = SyncStorePushResponseBase & {
  acknowledged: true
  results: SyncStorePushResult[]
}
interface SyncStorePushResponseBase {
  acknowledged: boolean
}

export type SyncStorePushResult = SyncStorePushResultSuccess | SyncStorePushResultFailure
export type SyncStorePushResultSuccess = SyncStorePushResultBase & {
  success: true
  entry: SyncPushEntry
}

export type SyncStorePushResultFailure = SyncStorePushResultInvalid
export type SyncStorePushResultInvalid = SyncStorePushResultFailureBase & {
  failureType: 'invalid'
}
interface SyncStorePushResultFailureBase extends SyncStorePushResultBase {
  success: false
  failureType: string
}
interface SyncStorePushResultBase {
  success: boolean
}

