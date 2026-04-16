import { initializeTestService } from '../initializeTests.js'
import {getActiveDiscussions} from "../../src/services/forums/forums.ts";

describe('forum', function () {
  beforeEach(() => {
    initializeTestService()
  })

  test('getActiveDiscussions', async () => {
    const results = await getActiveDiscussions('drumeo')
    console.log(results)
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
  })

})
