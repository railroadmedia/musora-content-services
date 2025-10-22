import './telemetry/index'

import { Q, RecordId } from "@nozbe/watermelondb"
import { type ModelSerialized, type RawSerialized } from "./serializers"
import { EpochSeconds } from "./utils/epoch"
import { Model } from "@nozbe/watermelondb"

export { default as db } from './repository-proxy'
export { Q }

export { default as SyncSession } from './run-scope'
export { default as SyncRetry } from './retry'
export { default as SyncManager } from './manager'
export { default as SyncContext } from './context'
export { SyncError } from './errors'

export type SyncToken = EpochSeconds

export type SyncSyncable<TModel extends Model = Model, TRecordKey extends string = 'id'> = {
  [K in TRecordKey]: RecordId
} & Omit<RawSerialized<TModel>, 'id'>

export type SyncEntry<TModel extends Model = Model, TRecordKey extends string = 'id'> = {
  record: SyncSyncable<TModel, TRecordKey> | null
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

export type SyncExistsDTO<_TModel extends Model, T extends boolean | boolean[]> = {
  data: T
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncReadData<T extends Model> = ModelSerialized<T> | ModelSerialized<T>[] | RecordId | RecordId[] | null
export type SyncReadDTO<T extends Model, TData extends SyncReadData<T>> = {
  data: TData
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncWriteData<T extends Model> = SyncWriteRecordData<T> | SyncWriteIdData<T>
export type SyncWriteRecordData<T extends Model> = ModelSerialized<T> | ModelSerialized<T>[]
export type SyncWriteIdData<_T extends Model> = RecordId | RecordId[]
export type SyncWriteDTO<T extends Model, TData extends SyncWriteData<T>> = {
  data: TData
  status: 'synced' | 'unsynced'
  pushStatus: 'success' | 'pending' | 'failure'
}

export type ModelClass<T extends Model = Model> = {
  new (...args: any[]): T
  table: string
}
