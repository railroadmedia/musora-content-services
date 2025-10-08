import BaseResolver from "./base";

import { Model } from "@nozbe/watermelondb";
import { SyncEntry } from "../index";
import { asEpochSeconds, msToS } from '../utils/epoch'

export default class LastWriteConflictResolver extends BaseResolver {
  againstNone(server: SyncEntry) {
    if (!server.meta.lifecycle.deleted_at) {
      this.createRecord(server)
    }
  }
  againstClean(local: Model, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.deleteRecord(local)
    } else {
      this.updateRecord(local, server)
    }
  }

  againstDirty(local: Model, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      // delete local even though user has newer changes
      // we don't ever try to resurrect records
      this.deleteRecord(local);
    } else if (
      asEpochSeconds(server.meta.lifecycle.updated_at) >
      msToS(local._raw['updated_at'])
    ) {
      // local is older, so update it
      this.updateRecord(local, server)
    } else {
      // last write wins, even though local is newer
      this.updateRecord(local, server)
    }
  }

  againstDeleted(local: Model, server: SyncEntry) {
    if (server.meta.lifecycle.deleted_at) {
      this.deleteRecord(local)
    } else {
      this.updateRecord(local, server)
    }
  }
}
