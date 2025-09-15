import { RecordId } from "@nozbe/watermelondb";
import { SyncEntry } from ".";
import BaseModel from "./models/Base";

export type SyncResolution = {
  entriesForCreate: SyncEntry[]
  tuplesForUpdate: [BaseModel, SyncEntry][]
  tuplesForRestore: [BaseModel, SyncEntry][]
  idsForDestroy: RecordId[]
}

export default class SyncResolver {
  private resolution: SyncResolution

  constructor() {
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
  againstClean(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    } else {
      this.resolution.tuplesForUpdate.push([local, server])
    }
  }

  againstDirty(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records here)
      this.resolution.idsForDestroy.push(local.id);
    } else if (server.meta.lifecycle.updated_at > local.updated_at) {
      // local is older, so update it
      this.resolution.tuplesForUpdate.push([local, server])
    }
  }

  againstDeleted(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.resolution.idsForDestroy.push(local.id)
    } else if (server.meta.lifecycle.updated_at > local.updated_at) {
      this.resolution.tuplesForRestore.push([local, server])
    } else {
      this.resolution.idsForDestroy.push(local.id);
    }
  }
}
