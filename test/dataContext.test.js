import { initializeTestService } from './initializeTests'
import { DataContext, verifyLocalDataContext } from '../src/services/dataContext.js'

describe('dataContext', function () {
  let mock = null
  let testVersion = 1
  const dataVersionKey = 1
  const dataContext = new DataContext(dataVersionKey, null)

  beforeEach(() => {
    initializeTestService()
    mock = jest.spyOn(dataContext, 'fetchData')
    mock.mockImplementation(() =>
      JSON.parse(`{"version":${testVersion},"data":[308516,308515,308514,308518]}`)
    )
  })

  test('verifyLocalData', async () => {
    //force load data into context and verify version 1 loaded
    await dataContext.getData()
    expect(dataContext.version()).toBe(1)

    //increment source version and verify data context still uses old version
    testVersion++
    await dataContext.getData()
    expect(dataContext.version()).toBe(1)

    //verifyLocalData with old source version and verify context still uses old version
    await verifyLocalDataContext(1, 1)
    await dataContext.getData()
    expect(dataContext.version()).toBe(1)

    //verifyLocalData with new source version and verify context loads new version
    await verifyLocalDataContext(1, 2)
    await dataContext.getData()
    expect(dataContext.version()).toBe(2)
  })
})
