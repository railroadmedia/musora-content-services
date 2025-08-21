import { RecordId } from "@nozbe/watermelondb"

export type SyncToken = string
export type SyncSyncable = { id: RecordId }

export type SyncEntry = {
  record: SyncSyncable
  meta: { deleted: boolean }
}
