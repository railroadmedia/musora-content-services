import { clearAllDataContexts } from "./dataContext.js";
import { clearPermissionsData } from "./userPermissions.js";

// clear possibly stale data on sign in
export async function onSignInHandler() {
  await clearLocalSessionData()
}

// explicitly clear all data on sign out
export async function onSignOutHandler() {
  await clearLocalSessionData()
}

async function clearLocalSessionData() {
  await Promise.all([
    clearAllDataContexts(),
    clearPermissionsData()
  ])
}
