import {
  getProgressPercentage,
  dataContext,
  recordWatchSession,
  getProgressPercentageByIds,
  getProgressState,
  getProgressStateByIds,
  getAllStarted,
  getAllCompleted,
  contentStatusCompleted,
  assignmentStatusCompleted,
  contentStatusReset,
  assignmentStatusReset,
  getAllStartedOrCompleted,
} from '../src/services/contentProgress'
import { initializeTestService } from './initializeTests'
import {getLessonContentRows, postContentCompleted} from '../src'
import {fetchRecent} from "../src/services/sanity";
import {getRecent, getTabResults} from "../src/services/content";

const railContentModule = require('../src/services/railcontent.js')

describe('contentProgressDataContext', function () {
  let mock = null
  const testVersion = 1
  let serverVersion = 2

  beforeEach(() => {
    initializeTestService()
    mock = jest.spyOn(dataContext, 'fetchData')
    var json = JSON.parse(
      `{"version":${testVersion},"config":{"key":1,"enabled":1,"checkInterval":1,"refreshInterval":2},"data":{"234191":{"s":"started","p":6,"t":20,"u":1731108082},"233955":{"s":"started","p":1,"u":1731108083},"259426":{"s":"completed","p":100,"u":1731108085}, "412986":{"s":"completed","p":100,"u":1731108085}}}`
    )
    mock.mockImplementation(() => json)

    let mock2 = jest.spyOn(railContentModule, 'postRecordWatchSession')
    mock2.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`))

    let mock3 = jest.spyOn(railContentModule, 'postContentCompleted')
    mock3.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`))

    let mock4 = jest.spyOn(railContentModule, 'postContentReset')
    mock4.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`))
  })

  test('getProgressPercentage', async () => {
    let result = await getProgressPercentage(234191)
    expect(result).toBe(6)
  })

  test('getProgressPercentageByIds', async () => {
    let result = await getProgressPercentageByIds([234191, 111111])
    expect(result[234191]).toBe(6)
    expect(result[111111]).toBe(0)
  })

  test('getProgressPercentage_notExists', async () => {
    let result = await getProgressPercentage(111111)
    expect(result).toBe(0)
  })

  test('getProgressState', async () => {
    let result = await getProgressState(234191)
    expect(result).toBe('started')
  })

  test('getProgressStateByIds', async () => {
    let result = await getProgressStateByIds([234191, 120402])
    expect(result[234191]).toBe('started')
    expect(result[120402]).toBe('')
  })

  test('getAllStarted', async () => {
    let result = await getAllStarted()
    expect(result).toStrictEqual([233955, 234191])

    result = await getAllStarted(1)
    expect(result).toStrictEqual([233955])
  })

  test('getAllStartedOrCompleted', async () => {
    let result = await getAllStartedOrCompleted()
    expect(result).toStrictEqual([259426, 412986, 233955, 234191])
  })

  // test('getAllStartedWithUpdate', async () => {
  //     let mock2 = jest.spyOn(railContentModule, 'postRecordWatchSession');
  //     let serverVersion = 2;
  //     mock2.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`));
  //     let result = await getAllStarted();
  //     expect(result).toStrictEqual([233955, 234191]);
  //     await recordWatchSession(111111, "video", "vimeo", 100, 50, 50);
  //
  //     let result2 = await getAllStarted();
  //     expect(result2).toStrictEqual([111111, 233955, 234191]);
  // });

  // test('getAllCompletedWithUpdate', async () => {
  //     let mock2 = jest.spyOn(railContentModule, 'postContentCompleted');
  //     let serverVersion = 2;
  //     mock2.mockImplementation(() => JSON.parse(`{"version": ${serverVersion}}`));
  //
  //     let result = await getAllCompleted();
  //     expect(result).toStrictEqual([259426]);
  //     await contentStatusCompleted(111111);
  //     let result2 = await getAllCompleted();
  //     expect(result2).toStrictEqual([111111, 259426]);
  // });

  test('progressBubbling', async () => {
    let progress = await getProgressPercentage(241250) //force load context

    await recordWatchSession(241250, 'video', 'vimeo', 100, 50, 50)
    serverVersion++
    await recordWatchSession(241251, 'video', 'vimeo', 100, 50, 50)
    serverVersion++
    await recordWatchSession(241252, 'video', 'vimeo', 100, 50, 50)
    serverVersion++
    await recordWatchSession(241260, 'video', 'vimeo', 100, 100, 100)
    serverVersion++
    await recordWatchSession(241261, 'video', 'vimeo', 100, 100, 100)
    serverVersion++
    progress = await getProgressPercentage(241250)

    expect(progress).toBe(50)
    let progress241249 = await getProgressPercentage(241249)
    expect(progress241249).toBe(15)
    let progress241248 = await getProgressPercentage(241248)
    expect(progress241248).toBe(7)
    let progress241247 = await getProgressPercentage(241247)
    expect(progress241247).toBe(1)
  }, 50000)

  // test('completedProgressNotOverwritten', async () => {
  //     const contentId = 241262;
  //     let progress = await getProgressPercentage(241250); //force load context
  //     await contentStatusCompleted(contentId);
  //     await recordWatchSession(contentId, "video", "vimeo", 100, 50, 50);
  //     progress = await getProgressPercentage(contentId);
  //     expect(progress).toBe(100);
  // });

  test('assignmentCompleteBubbling', async () => {
    let assignmentId = 286048
    let contentId = 286047

    let state = await getProgressState(contentId)
    expect(state).toBe('')
    let result = await assignmentStatusCompleted(assignmentId, contentId)

    state = await getProgressState(assignmentId)
    expect(state).toBe('completed')
    state = await getProgressState(contentId) //assignment
    expect(state).toBe('started')
  })

  // test('recordWatchSession', async () => {
  //     const contentId = 241250;
  //     let progress = await getProgressPercentage(contentId); //force load context
  //
  //     await recordWatchSession(contentId, 'video', 'vimeo', 1673, 554, 5);
  //     progress = await getProgressPercentage(241250);
  //
  //     expect(progress).toBe(33);
  // });
  // test('assignmentCompleteBubblingToCompleted', async () => {
  //     let assignmentId = 241685;
  //     let contentId = 241257;
  //
  //     let state = await getProgressState(contentId);
  //     expect(state).toBe("");
  //     let result = await assignmentStatusCompleted(assignmentId, contentId);
  //
  //     state = await getProgressState(assignmentId);
  //     expect(state).toBe("completed");
  //     state = await getProgressState(contentId); //assignment
  //     expect(state).toBe("completed");
  // });
  //
  // test('assignmentCompleteResetBubblingMultiple', async () => {
  //     let contentId = 281709;
  //
  //     let state = await getProgressState(contentId);
  //     expect(state).toBe("");
  //
  //     let assignmentIds = [281710, 281711, 281712, 281713, 281714, 281715];
  //     for (const assignmentId of assignmentIds) {
  //         await assignmentStatusCompleted(assignmentId, contentId);
  //         state = await getProgressState(assignmentId);
  //         expect(state).toBe("completed");
  //     }
  //
  //     state = await getProgressState(contentId);
  //     expect(state).toBe("completed");
  //
  //     await assignmentStatusReset(assignmentIds[0], contentId);
  //     state = await getProgressState(assignmentIds[0]);
  //     expect(state).toBe("");
  //     state = await getProgressState(contentId);
  //     expect(state).toBe("started");
  //     let percentage = await getProgressPercentage(contentId);
  //     expect(percentage).toBe(83);
  // });

  //
  // test('completeBubbling', async () => {
  //     let state = await getProgressState(276698);
  //     expect(state).toBe("");
  //     let result = await contentStatusCompleted(276698);
  //
  //     state = await getProgressState(276698);
  //     expect(state).toBe("completed");
  //     state = await getProgressState(276699); //assignment
  //     expect(state).toBe("completed");
  // });
  //
  // test('resetBubbling', async () => {
  //     let assignmentId = 241686;
  //     let contentId = 241258;
  //
  //     let state = await getProgressState(contentId);
  //     expect(state).toBe("");
  //     let result = await contentStatusCompleted(contentId);
  //     state = await getProgressState(contentId);
  //     expect(state).toBe("completed");
  //     state = await getProgressState(assignmentId); //assignment
  //     expect(state).toBe("completed");
  //
  //     result = await contentStatusReset(contentId);
  //     state = await getProgressState(contentId);
  //     expect(state).toBe("");
  //     state = await getProgressState(assignmentId); //assignment
  //     expect(state).toBe("");
  //
  // });
  test('getRecentLessons', async () => {
    let result = await getRecent('drumeo','lessons', 'all',{page:1, limit:10})
    console.log(result);
    expect(result.data[0].id).toStrictEqual(412986)
    expect(result.data[1].id).toStrictEqual(233955)
  })

  test('getRecentLessons-Incomplete', async () => {
    let result = await getRecent('drumeo','lessons','Incomplete')
    console.log(result);
    expect(result.data[0].id).toStrictEqual(233955)
  })

  test('getRecentLessons-Completed', async () => {
    let result = await getRecent('drumeo','lessons','Completed')
    console.log(result);
    expect(result.data[0].id).toStrictEqual(412986)
  })

  test('get-Songs-For-You', async () => {
    let result = await getTabResults('drumeo','songs','For You')
    console.log(result);
   // expect(result.data[0].id).toStrictEqual(412986)
  })

  test('get-Songs-Tutorials', async () => {
    let result = await getTabResults('pianote','songs','Tutorials')
    console.log(result);
    // expect(result.data[0].id).toStrictEqual(412986)
  })

  test('get-Songs-Transcriptions', async () => {
    let result = await getTabResults('pianote','songs','Transcriptions')
    console.log(result);
    // expect(result.data[0].id).toStrictEqual(412986)
  })

  test('get-Songs-Play-Alongs', async () => {
    let result = await getTabResults('drumeo','songs','Play-Alongs',{selectedFilters:['difficulty,Expert']})
    console.log(result);
    // expect(result.data[0].id).toStrictEqual(412986)
  })

})
