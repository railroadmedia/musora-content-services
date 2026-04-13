const { fetchUserPermissions, reset } = require('../../src/services/permissions/permissions')
const { initializeTestService } = require('../initializeTests')

describe('user.permissions', function () {
  beforeEach(async () => {
    await reset()
    initializeTestService()
  })

  test.skip('fetchUserPermissions', async () => {
    let result = await fetchUserPermissions() //fetch from server
    let result2 = await fetchUserPermissions() //fetch locally

    //This breaks when running tests in parallel
    //expect(railContentModule.fetchUserPermissionsData).toHaveBeenCalledTimes(1);
    expect(result.permissions).toStrictEqual([108, 91, 92])
    expect(result.isAdmin).toStrictEqual(false)
    expect(result).toBe(result2)
  })
})
