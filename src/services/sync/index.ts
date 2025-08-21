import { RecordId } from "@nozbe/watermelondb"

export type SyncToken = string
export type SyncSyncable = { id: RecordId }

export type SyncEntry = {
  record: SyncSyncable
  meta: {
    created_at: string
    updated_at: string
    deleted_at: string | null
  }
}
