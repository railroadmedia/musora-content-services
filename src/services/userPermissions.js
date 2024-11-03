import {
    fetchUserPermissionsData
} from "./railcontent";

let userPermissionsPromise = null;

export async function fetchUserPermissions() {
    if (!userPermissionsPromise) {
        userPermissionsPromise = fetchUserPermissionsData();
    }
    return await userPermissionsPromise;
}
