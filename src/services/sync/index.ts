import './telemetry/index'

import { Q, RecordId } from "@nozbe/watermelondb"
import { type ModelSerialized, type RawSerialized } from "./serializers"
import { EpochSeconds } from "./utils/epoch"
import BaseModel from "./models/Base"

export { default as db } from './repository-proxy'
export { Q }

export { default as SyncSession } from './run-scope'
export { default as SyncRetry } from './retry'
export { default as SyncManager } from './manager'
export { default as SyncContext } from './context'
export { SyncError } from './errors'

export type SyncToken = EpochSeconds

export type SyncSyncable<TModel extends BaseModel = BaseModel, TRecordKey extends string = 'id'> = {
  [K in TRecordKey]: RecordId
} & Omit<RawSerialized<TModel>, 'id'>

export type SyncEntry<TModel extends BaseModel = BaseModel, TRecordKey extends string = 'id'> = SyncEntryNonDeleted<TModel, TRecordKey> | SyncEntryDeleted<TModel, TRecordKey>

export type SyncEntryNonDeleted<TModel extends BaseModel = BaseModel, TRecordKey extends string = 'id'> = {
  record: SyncSyncable<TModel, TRecordKey>
  meta: {
    ids: { [K in TRecordKey]: RecordId }
    lifecycle: {
      created_at: EpochSeconds
      updated_at: EpochSeconds
      deleted_at: null
    }
  }
}

export type SyncEntryDeleted<_TModel extends BaseModel = BaseModel, TRecordKey extends string = 'id'> = {
  record: null
  meta: {
    ids: { [K in TRecordKey]: RecordId }
    lifecycle: {
      created_at: EpochSeconds
      updated_at: EpochSeconds
      deleted_at: EpochSeconds
    }
  }
}

export type SyncExistsDTO<_TModel extends BaseModel, T extends boolean | boolean[]> = {
  data: T
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncReadData<T extends BaseModel> = ModelSerialized<T> | ModelSerialized<T>[] | RecordId | RecordId[] | null
export type SyncReadDTO<T extends BaseModel, TData extends SyncReadData<T>> = {
  data: TData
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncWriteData<T extends BaseModel> = SyncWriteRecordData<T> | SyncWriteIdData<T>
export type SyncWriteRecordData<T extends BaseModel> = ModelSerialized<T> | ModelSerialized<T>[]
export type SyncWriteIdData<_T extends BaseModel> = RecordId | RecordId[]
export type SyncWriteDTO<T extends BaseModel, TData extends SyncWriteData<T>> = {
  data: TData
  status: 'synced' | 'unsynced'
  pushStatus: 'success' | 'pending' | 'failure'
}

export type ModelClass<T extends BaseModel = BaseModel> = {
  new (...args: any[]): T
  table: string
}
