import { RecordId } from "@nozbe/watermelondb";
import { SyncEntry } from ".";
import BaseModel from "./models/Base";

export type SyncResolution = {
  entriesForCreate: SyncEntry[]
  tuplesForUpdate: [BaseModel, SyncEntry][]
  tuplesForRestore: [BaseModel, SyncEntry][]
  idsForDestroy: RecordId[]
}

export type SyncResolverComparator<T extends BaseModel = BaseModel> = (serverEntry: SyncEntry<T>, localModel: T) => 'SERVER' | 'LOCAL'

export const updatedAtComparator: SyncResolverComparator = (server, local) => {
  return server.meta.lifecycle.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
}
export default class SyncResolver {
  private resolution: SyncResolution
  private comparator: SyncResolverComparator

  constructor(comparator?: SyncResolverComparator) {
    this.comparator = comparator || updatedAtComparator
    this.resolution = {
      entriesForCreate: [],
      tuplesForUpdate: [],
      tuplesForRestore: [],
      idsForDestroy: []
    }
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
    else if (this.comparator(server, local) !== 'LOCAL') {
      this.resolution.tuplesForUpdate.push([local, server])
    }
  }

  // can happen if one tab notifies another of a created record, pushes to server, and other tab pulls
  againstCreated(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id)
    } else if (this.comparator(server, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, server])
    }
  }

  againstUpdated(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id);
    } else if (this.comparator(server, local) !== 'LOCAL') {
      // local is older, so update it with server's
      this.resolution.tuplesForUpdate.push([local, server])
    }
  }

  againstDeleted(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    } else if (server.meta.lifecycle.updated_at >= local.updated_at) {
      this.resolution.tuplesForRestore.push([local, server])
    } else {
      this.resolution.idsForDestroy.push(local.id);
    }
  }
}
