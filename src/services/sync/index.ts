import './telemetry'

import BaseModel from "./models/Base"
import { RecordId } from "@nozbe/watermelondb"
import { type ModelSerialized } from "./serializers"
import { EpochSeconds } from "./utils/epoch"

export { default as SyncSession } from './run-scope'
export { default as SyncBackoff } from './backoff'
export { default as SyncManager } from './manager'
export { default as SyncContext } from './context'

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

export type SyncExistsDTO<TMultiple extends boolean = false> = {
  data: TMultiple extends true ? boolean[] : boolean
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncReadDTO<TModel extends BaseModel, TMultiple extends boolean = false> = {
  data: TMultiple extends true ? ModelSerialized<TModel>[] : ModelSerialized<TModel> | null
  status: 'fresh' | 'stale'
  pullStatus: 'success' | 'pending' | 'failure' | null
  lastFetchToken: SyncToken | null
}

export type SyncWriteDTO<T extends BaseModel> = SyncNonDeleteWriteDTO<T> | SyncDeleteWriteDTO

type SyncNonDeleteWriteDTO<T extends BaseModel, TMultiple extends boolean = false> = SyncWriteDTOBase & {
  data: TMultiple extends true ? ModelSerialized<T>[] : ModelSerialized<T>
}

type SyncDeleteWriteDTO<TMultiple extends boolean = false> = SyncWriteDTOBase & {
  data: TMultiple extends true ? RecordId[] : RecordId
}

interface SyncWriteDTOBase {
  status: 'synced' | 'unsynced'
  pushStatus: 'success' | 'pending' | 'failure'
}

