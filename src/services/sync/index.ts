import './telemetry/index'

import { Q } from "@nozbe/watermelondb"
import { type ModelSerialized } from "./serializers"
import BaseModel from "./models/Base"

export type SyncUserScope = { initialId: number, getCurrentId: () => number }

export { default as db } from './repository-proxy'
export { Q }

export { default as SyncSession } from './run-scope'
export { default as SyncRetry } from './retry'
export { default as SyncManager } from './manager'
export { default as SyncContext } from './context'
export { SyncError } from './errors'

type Branded<T, B extends string> = T & { __brand: B }
export type EpochMs = Branded<number, 'EpochMs'>
export type SyncToken = EpochMs

export type SyncEntry<TModel extends BaseModel = BaseModel> = {
  record: TModel | null
  meta: {
    ids: { id: string }
    lifecycle: {
      created_at: EpochMs
      updated_at: EpochMs
      deleted_at: EpochMs | null
    }
  }
}
export type SyncEntryNonDeleted<TModel extends BaseModel = BaseModel> = {
  record: TModel
  meta: {
    ids: { id: string }
    lifecycle: {
      created_at: EpochMs
      updated_at: EpochMs
      deleted_at: null
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

export type SyncRemoteWriteDTO<T extends BaseModel> = {
  data: ModelSerialized<T> | null
  status: 'synced'
  pushStatus: 'success'
}

export type ModelClass<T extends BaseModel = BaseModel> = {
  new (...args: any[]): T
  table: string
}
