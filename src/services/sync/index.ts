import './telemetry/index'
export { default as db } from './repository-proxy'

import { RecordId } from "@nozbe/watermelondb"
import { type ModelSerialized } from "./serializers"
import { EpochSeconds } from "./utils/epoch"
import { Model } from "@nozbe/watermelondb"

export { default as SyncSession } from './run-scope'
export { default as SyncRetry } from './retry'
export { default as SyncManager } from './manager'
export { default as SyncContext } from './context'
export { SyncError } from './errors'

export type SyncToken = EpochSeconds

export type SyncSyncable<TRecordKey extends string = 'id'> = {
  [K in TRecordKey]: RecordId
} & Record<string, any>

export type SyncEntry<TRecordKey extends string = 'id'> = {
  record: SyncSyncable<TRecordKey> | null
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

export type SyncReadDTOTarget<TModel extends Model> = ModelSerialized<TModel> | ModelSerialized<TModel>[] | RecordId | RecordId[] | null

export type SyncReadDTO<TModel extends Model, T extends SyncReadDTOTarget<TModel>> = {
  data: T
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncWriteDTO<T extends Model> = SyncNonDeleteWriteDTO<T> | SyncDeleteWriteDTO

type SyncNonDeleteWriteDTO<T extends Model, TMultiple extends boolean = false> = SyncWriteDTOBase & {
  data: TMultiple extends true ? ModelSerialized<T>[] : ModelSerialized<T>
}

type SyncDeleteWriteDTO<TMultiple extends boolean = false> = SyncWriteDTOBase & {
  data: TMultiple extends true ? RecordId[] : RecordId
}

interface SyncWriteDTOBase {
  status: 'synced' | 'unsynced'
  pushStatus: 'success' | 'pending' | 'failure'
}

export type ModelClass<T extends Model = Model> = {
  new (...args: any[]): T
  table: string
}
