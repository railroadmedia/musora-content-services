import { clearAllDataContexts } from "./dataContext";
import { resetUserPermissions } from "./user/permissions";

// explicitly clear all data on sign out
export async function onSignOutHandler() {
  await clearLocalSessionData()
}

export async function clearLocalSessionData() {
  await Promise.all([
    clearAllDataContexts(),
    resetUserPermissions()
  ])
}
