const { fetchUserPermissions } = require('../src/services/userPermissions')
const { initializeTestService } = require('./initializeTests')
const {
  updatePermissionsData,
  clearPermissionsData,
} = require('../src/services/userPermissions.js')

describe('userPermissions', function () {
  beforeEach(() => {
    initializeTestService()
  })

  test('fetchUserPermissions', async () => {
    let result = await fetchUserPermissions() //fetch from server
    let result2 = await fetchUserPermissions() //fetch locally

    //This breaks when running tests in parallel
    //expect(railContentModule.fetchUserPermissionsData).toHaveBeenCalledTimes(1);
    expect(result.permissions).toStrictEqual([78, 91, 92])
    expect(result.isAdmin).toStrictEqual(false)
    expect(result).toBe(result2)
  })

  test('updatePermissionsData', async () => {
    const newPermissions = [80, 81, 82]
    const isAdminUpdate = true

    // Call the function to update permissions
    await updatePermissionsData({
      permissions: newPermissions,
      isAdmin: isAdminUpdate,
    })
    let result = await fetchUserPermissions()

    expect(result.permissions).toStrictEqual(newPermissions)
    expect(result.isAdmin).toStrictEqual(isAdminUpdate)

    await clearPermissionsData()
    result = await fetchUserPermissions()

    expect(result.permissions).toStrictEqual([78, 91, 92])
    expect(result.isAdmin).toStrictEqual(false)
  })
})
