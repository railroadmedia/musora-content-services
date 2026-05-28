import { RecordId } from "@nozbe/watermelondb";
import { SyncEntry, SyncEntryNonDeleted, ColumnMergeStrategies, ModelFields } from ".";
import BaseModel from "./models/Base";

export type SyncResolution = {
  entriesForCreate: SyncEntry[]
  tuplesForUpdate: [BaseModel, SyncEntry][]
  tuplesForRestore: [BaseModel, SyncEntry][]
  idsForDestroy: RecordId[]
  recordsForSynced: [BaseModel, Record<string, unknown>][]
}

export type SyncResolverComparator<T extends BaseModel = BaseModel> = (serverEntry: SyncEntryNonDeleted<T>, localModel: T) => 'SERVER' | 'LOCAL'

export const updatedAtComparator: SyncResolverComparator = (server, local) => {
  return server.meta.lifecycle.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
}
export default class SyncResolver<TModel extends BaseModel = BaseModel> {
  private resolution: SyncResolution
  private comparator: SyncResolverComparator
  private columnMergeStrategies: ColumnMergeStrategies<TModel>

  constructor(comparator?: SyncResolverComparator, columnMergeStrategies?: ColumnMergeStrategies<TModel>) {
    this.comparator = comparator || updatedAtComparator
    this.columnMergeStrategies = columnMergeStrategies ?? {} as ColumnMergeStrategies<TModel>
    this.resolution = {
      entriesForCreate: [],
      tuplesForUpdate: [],
      tuplesForRestore: [],
      idsForDestroy: [],
      recordsForSynced: []
    }
  }

  private mergeStrategyColumns(local: TModel, server: SyncEntryNonDeleted<TModel>): Partial<ModelFields<TModel>> {
    const merged: Partial<ModelFields<TModel>> = {}
    const serverFields = server.record as unknown as ModelFields<TModel>
    for (const key of Object.keys(this.columnMergeStrategies) as (keyof ModelFields<TModel>)[]) {
      const strategy = this.columnMergeStrategies[key]
      if (strategy) {
        merged[key] = strategy(local[key as keyof TModel] as ModelFields<TModel>[typeof key], serverFields[key], local, serverFields)
      }
    }
    return merged
  }

  private withMergedColumns(local: TModel, server: SyncEntryNonDeleted<TModel>): SyncEntry {
    const mergedFields = this.mergeStrategyColumns(local, server)
    if (Object.keys(mergedFields).length === 0) return server
    return { ...server, record: { ...server.record, ...mergedFields } as typeof server.record }
  }

  get result() {
    return { ...this.resolution }
  }

  againstNone(server: SyncEntry) {
    if (!server.meta.lifecycle.deleted_at) {
      this.resolution.entriesForCreate.push(server)
    }
  }

  againstSynced(local: TModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    }
    // take care that the server stamp isn't older than the current local
    // (imagine a race condition where a pull request resolves long after a second one)
    else if (this.comparator(server as SyncEntryNonDeleted<TModel>, local) !== 'LOCAL') {
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<TModel>)])
    }
  }

  // can happen if one tab notifies another of a created record, pushes to server, and other tab pulls
  againstCreated(local: TModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id)
    } else if (this.comparator(server as SyncEntryNonDeleted<TModel>, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<TModel>)])
    } else {
      // server is older - can happen with clock skew - just mark as synced
      this.resolution.recordsForSynced.push([local, this.mergeStrategyColumns(local, server as SyncEntryNonDeleted<TModel>)])
    }
  }

  againstUpdated(local: TModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id);
    } else if (this.comparator(server as SyncEntryNonDeleted<TModel>, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<TModel>)])
    } else {
      // server is older - can happen with clock skew - just mark as synced
      this.resolution.recordsForSynced.push([local, this.mergeStrategyColumns(local, server as SyncEntryNonDeleted<TModel>)])
    }
  }

  againstDeleted(local: TModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    } else if (server.meta.lifecycle.updated_at >= local.updated_at) {
      this.resolution.tuplesForRestore.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<TModel>)])
    } else {
      this.resolution.idsForDestroy.push(local.id);
    }
  }
}
