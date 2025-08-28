import { RecordId } from "@nozbe/watermelondb"
import SyncStoreOrchestrator from "./orchestrator"
import SyncStore from "./store"
import { type DatabaseAdapter } from "./adapters/factory"
import { Database } from "@nozbe/watermelondb"

export { default as SyncOrchestrator } from './orchestrator'
export { default as SyncExecutor } from './executor'

export type SyncContext = {
  adapter: DatabaseAdapter
  databases: Database[]
  stores: Record<string, SyncStore>
  orchestrator: SyncStoreOrchestrator
}

export type SyncToken = string

export type SyncSyncable<TRecordKey extends string = 'id'> = {
  [K in TRecordKey]: RecordId
} & Record<string, any>

export type SyncEntry<TRecordKey extends string = 'id'> = {
  record: SyncSyncable<TRecordKey>
  meta: {
    ids: { [K in TRecordKey]: RecordId }
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

export type SyncStorePushResponse<TRecordKey extends string = 'id'> = SyncStorePushResponseUnreachable | SyncStorePushResponseAcknowledged<TRecordKey>

export type SyncStorePushResponseUnreachable = SyncStorePushResponseBase & {
  acknowledged: false
  status: 'unreachable'
  originalError: Error
}
export type SyncStorePushResponseAcknowledged<TRecordKey extends string = 'id'> = SyncStorePushResponseBase & {
  acknowledged: true
  results: SyncStorePushResult<TRecordKey>[]
}
interface SyncStorePushResponseBase {
  acknowledged: boolean
}

export type SyncStorePushResult<TRecordKey extends string = 'id'> = SyncStorePushResultSuccess<TRecordKey> | SyncStorePushResultFailure<TRecordKey>
export type SyncStorePushResultSuccess<TRecordKey extends string = 'id'> = SyncStorePushResultBase & {
  success: true
  entry: SyncEntry<TRecordKey>
}

export type SyncStorePushResultFailure<TRecordKey extends string = 'id'> = SyncStorePushResultInvalid<TRecordKey>
export type SyncStorePushResultInvalid<TRecordKey extends string = 'id'> = SyncStorePushResultFailureBase<TRecordKey> & {
  failureType: 'invalid'
}
interface SyncStorePushResultFailureBase<TRecordKey extends string = 'id'> extends SyncStorePushResultBase {
  success: false
  failureType: string
  ids: { [K in TRecordKey]: RecordId }
}
interface SyncStorePushResultBase {
  success: boolean
}

