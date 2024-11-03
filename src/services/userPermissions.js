import {
    fetchUserPermissions
} from "./railcontent";

let userPermissionsPromise = null;

export async function fetchUserPermissions() {
    if (!userPermissionsPromise) {
        userPermissionsPromise = fetchUserPermissions();
    }
    return await userPermissionsPromise;
}
