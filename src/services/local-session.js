import { clearAllDataContexts } from "./dataContext.js";
import { clearPermissionsData } from "./userPermissions.js";

// clear possibly stale data on sign in
export async function onLogInHandler() {
  await clearLocalSessionData()
}

// explicitly clear all data on sign out
export async function onLogOutHandler() {
  await clearLocalSessionData()
}

async function clearLocalSessionData() {
  await Promise.all([
    clearAllDataContexts(),
    clearPermissionsData()
  ])
}
