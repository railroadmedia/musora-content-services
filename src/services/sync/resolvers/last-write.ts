import BaseResolver from "./base";

import { Model } from "@nozbe/watermelondb";
import { SyncEntry } from "../index";
import BaseModel from "../models/Base";

export default class LastWriteConflictResolver extends BaseResolver {
  againstNone(server: SyncEntry) {
    if (!server.meta.lifecycle.deleted_at) {
      this.createRecord(server)
    }
  }
  againstClean(local: Model, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.destroyRecord(local.id)
    } else {
      this.updateRecord(local, server)
    }
  }

  againstDirty(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // (we don't ever try to resurrect records)
      this.destroyRecord(local.id);
    } else if (server.meta.lifecycle.updated_at > local.updated_at) {
      // local is older, so update it
      this.updateRecord(local, server)
    } else {
      // last write wins, even though local is newer
      this.updateRecord(local, server)
    }
  }

  againstDeleted(local: BaseModel, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.destroyRecord(local.id)
    } else if (server.meta.lifecycle.updated_at > local.updated_at) {
      this.restoreRecord(local, server)
    } else {
      this.destroyRecord(local.id);
    }
  }
}
