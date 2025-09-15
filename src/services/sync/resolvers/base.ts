import { SyncEntry } from "../index";
import { Model, RecordId } from "@nozbe/watermelondb";

export default abstract class BaseResolver {
  createRecord: (server: SyncEntry) => void
  updateRecord: (local: Model, server: SyncEntry) => void
  restoreRecord: (local: Model, server: SyncEntry) => void
  destroyRecord: (id: RecordId) => void

  constructor(callbacks: {
    createRecord: (server: SyncEntry) => void
    updateRecord: (local: Model, server: SyncEntry) => void
    restoreRecord: (local: Model, server: SyncEntry) => void
    destroyRecord: (id: RecordId) => void
  }) {
    this.createRecord = callbacks.createRecord
    this.updateRecord = callbacks.updateRecord
    this.restoreRecord = callbacks.restoreRecord
    this.destroyRecord = callbacks.destroyRecord
  }

  abstract againstNone(server: SyncEntry): void
  abstract againstClean(local: Model, server: SyncEntry): void
  abstract againstDirty(local: Model, server: SyncEntry): void
  abstract againstDeleted(local: Model, server: SyncEntry): void
}
