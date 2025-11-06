import { initializeTestService } from './initializeTests.js'
import { getLessonContentRows, getTabResults } from '../src/services/content.js'
import {getActiveDiscussions} from "../src/services/forums/forums";

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
