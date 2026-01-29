import type SyncContext from "../context"
import type SyncStore from "../store"

export type SyncEffect = (context: SyncContext, stores: SyncStore[]) => () => void

export { default as createLogoutWarningEffect } from './logout-warning'
export { default as createPushFailureNotificationEffect } from './push-failure-notification'
