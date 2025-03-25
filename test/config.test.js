import { setUserMetadata, verifyLocalDataContext } from '../src/services/config.js'
import { initializeTestService } from './initializeTests.js'
import { fetchUserPermissions, updatePermissionsData } from '../src/services/userPermissions.js'

describe('config', function () {
  beforeEach(() => {
    initializeTestService()
  })

  test('setUserMetadata', async () => {
    const newPermissions = [80, 81, 82]
    const isAdminUpdate = true

    const userMetadata = {
      permissionsData: { permissions: newPermissions, isAdmin: isAdminUpdate },
      userDataVersions: [
        { dataVersionKey: 1, currentVersion: 2 },
        { dataVersionKey: 2, currentVersion: 3 },
      ],
    }

    setUserMetadata(userMetadata)

    let result = await fetchUserPermissions()

    expect(result.permissions).toStrictEqual(newPermissions)
    expect(result.isAdmin).toStrictEqual(isAdminUpdate)
  })
})
