import { initializeTestService } from '../initializeTests'

describe('railcontentLive', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  }, 1000000)
})
