import { SyncEntry } from "../index";
import { Model } from "@nozbe/watermelondb";

export default abstract class BaseResolver {
  createRecord: (server: SyncEntry) => void
  updateRecord: (local: Model, server: SyncEntry) => void
  deleteRecord: (local: Model) => void

  constructor(callbacks: {
    createRecord: (server: SyncEntry) => void
    updateRecord: (local: Model, server: SyncEntry) => void
    deleteRecord: (local: Model) => void
  }) {
    this.createRecord = callbacks.createRecord
    this.updateRecord = callbacks.updateRecord
    this.deleteRecord = callbacks.deleteRecord
  }

  abstract againstNone(server: SyncEntry): void
  abstract againstClean(local: Model, server: SyncEntry): void
  abstract againstDirty(local: Model, server: SyncEntry): void
  abstract againstDeleted(local: Model, server: SyncEntry): void
}
