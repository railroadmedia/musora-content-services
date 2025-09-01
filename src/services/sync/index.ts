import { RecordId } from "@nozbe/watermelondb"
import { EpochSeconds } from "./utils/brands"

export { default as SyncSession } from './session'
export { default as SyncOrchestrator } from './orchestrator'
export { default as SyncExecutor } from './executor'
export { default as SyncContext } from './context'

export type SyncToken = EpochSeconds

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
  created_at: EpochSeconds
  updated_at: EpochSeconds
  deleted_at: EpochSeconds | null
}

export type SyncStorePullMultiDTO = SyncStorePullDTO<SyncSyncable[]>
export type SyncStorePullSingleDTO = SyncStorePullDTO<SyncSyncable>
export type SyncStorePullDTO<T = SyncSyncable | SyncSyncable[]> = {
  success: true
  data: T
  status: 'fresh' | 'possiblyStale'
  previousFetchToken: SyncToken | null
  fetchToken: SyncToken | null
}

export type SyncStorePushDTO<T = SyncSyncable> = {
  data: T
  state: 'synced'
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
  type: 'success'
  entry: SyncEntry<TRecordKey>
}

export type SyncStorePushResultFailure<TRecordKey extends string = 'id'> = SyncStorePushResultInvalid<TRecordKey>
export type SyncStorePushResultInvalid<TRecordKey extends string = 'id'> = SyncStorePushResultFailureBase<TRecordKey> & {
  failureType: 'invalid'
  errors: Record<string, string[]>
}
interface SyncStorePushResultFailureBase<TRecordKey extends string = 'id'> extends SyncStorePushResultBase {
  type: 'failure'
  failureType: string
  ids: { [K in TRecordKey]: RecordId }
}
interface SyncStorePushResultBase {
  type: 'success' | 'failure'
}

