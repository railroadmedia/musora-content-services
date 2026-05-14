import { RecordId } from "@nozbe/watermelondb";
import { SyncEntry, SyncEntryNonDeleted, ColumnMergeStrategy } from ".";
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
export default class SyncResolver {
  private resolution: SyncResolution
  private comparator: SyncResolverComparator
  private columnMergeStrategies: Record<string, ColumnMergeStrategy>

  constructor(comparator?: SyncResolverComparator, columnMergeStrategies?: Record<string, ColumnMergeStrategy>) {
    this.comparator = comparator || updatedAtComparator
    this.columnMergeStrategies = columnMergeStrategies ?? {}
    this.resolution = {
      entriesForCreate: [],
      tuplesForUpdate: [],
      tuplesForRestore: [],
      idsForDestroy: [],
      recordsForSynced: []
    }
  }

  private mergeStrategyColumns(local: BaseModel, server: SyncEntryNonDeleted<BaseModel>): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    for (const [key, strategy] of Object.entries(this.columnMergeStrategies)) {
      merged[key] = strategy(
        (local as any)[key],
        (server.record as any)[key],
        local as any,
        server.record as any
      )
    }
    return merged
  }

  private withMergedColumns(local: BaseModel, server: SyncEntryNonDeleted<BaseModel>): SyncEntry {
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

  againstSynced(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    }
    // take care that the server stamp isn't older than the current local
    // (imagine a race condition where a pull request resolves long after a second one)
    else if (this.comparator(server as SyncEntryNonDeleted<BaseModel>, local) !== 'LOCAL') {
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    }
  }

  // can happen if one tab notifies another of a created record, pushes to server, and other tab pulls
  againstCreated(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id)
    } else if (this.comparator(server as SyncEntryNonDeleted<BaseModel>, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    } else {
      // server is older - can happen with clock skew - just mark as synced
      this.resolution.recordsForSynced.push([local, this.mergeStrategyColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    }
  }

  againstUpdated(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id);
    } else if (this.comparator(server as SyncEntryNonDeleted<BaseModel>, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    } else {
      // server is older - can happen with clock skew - just mark as synced
      this.resolution.recordsForSynced.push([local, this.mergeStrategyColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    }
  }

  againstDeleted(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    } else if (server.meta.lifecycle.updated_at >= local.updated_at) {
      this.resolution.tuplesForRestore.push([local, this.withMergedColumns(local, server as SyncEntryNonDeleted<BaseModel>)])
    } else {
      this.resolution.idsForDestroy.push(local.id);
    }
  }
}
