import { filterOutLearningPathsForDuplication } from '../../../../src/services/progress/internal/learning-path'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '../../../../src/services/sync/models/ContentProgress'

describe('filterOutLearningPathsForDuplication', () => {
  test('non-LP collection — all entries pass through', () => {
    const progresses = { 101: 30, 102: 50 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.SELF,
      id: COLLECTION_ID_SELF,
    })
    expect(result).toEqual({ 101: 30, 102: 50 })
  })

  test('LP collection — excludes entry whose id matches collection id', () => {
    const progresses = { 200: 50, 101: 30, 102: 60 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 200,
    })
    expect(result).not.toHaveProperty('200')
    expect(result).toEqual({ 101: 30, 102: 60 })
  })

  test('LP collection — string key is coerced via Number(id) comparison', () => {
    const progresses = { '300': 40, 101: 30 } as Record<number, number>
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 300,
    })
    expect(result).not.toHaveProperty('300')
    expect(result).toHaveProperty('101')
  })

  test('returns a new object, not the original', () => {
    const progresses = { 101: 30 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.SELF,
      id: COLLECTION_ID_SELF,
    })
    expect(result).not.toBe(progresses)
  })
})
