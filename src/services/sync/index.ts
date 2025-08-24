import { RecordId } from "@nozbe/watermelondb"

export type SyncToken = string
export type SyncSyncable = { id: RecordId } & Record<string, any>

export type SyncPullEntry = {
  record: SyncSyncable
  meta: {
    lifecycle: SyncEntryLifecycle
  }
}

export type SyncPushEntry = {
  record: SyncSyncable
  meta: {
    result: SyncPushResult
    lifecycle: SyncEntryLifecycle
  }
}

type SyncEntryLifecycle = {
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type SyncPushResult = SyncPushSuccessResult | SyncPushFailureResult

interface SyncPushResultBase {
  success: boolean
}

type SyncPushSuccessResult = SyncPushResultBase & {
  success: true
}

type SyncPushFailureResult = SyncPushValidationFailureResult

interface SyncPushFailureResultBase {
  success: false
  failureType: string
}

type SyncPushValidationFailureResult = SyncPushFailureResultBase & {
  failureType: 'validation'
  validationErrors: Record<string, string[]>
}
