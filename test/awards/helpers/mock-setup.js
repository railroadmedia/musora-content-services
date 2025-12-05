import { mockAwardDefinitions } from '../../mockData/award-definitions'

export const createRepositoryProxyMock = () => ({
  contentProgress: {
    getOneProgressByContentId: jest.fn(),
    getSomeProgressByContentIds: jest.fn(),
    queryOne: jest.fn(),
    queryAll: jest.fn()
  },
  practices: {
    sumPracticeMinutesForContent: jest.fn()
  },
  userAwardProgress: {
    hasCompletedAward: jest.fn(),
    recordAwardProgress: jest.fn(),
    getByAwardId: jest.fn(),
    getAll: jest.fn(),
    getAwardsForContent: jest.fn()
  }
})

export const setupDefaultMocks = (db, fetchSanity, options = {}) => {
  const {
    definitions = mockAwardDefinitions,
    practiceMinutes = 200,
    hasCompleted = false
  } = options

  fetchSanity.mockResolvedValue(definitions)

  db.practices.sumPracticeMinutesForContent.mockResolvedValue(practiceMinutes)
  db.userAwardProgress.hasCompletedAward.mockResolvedValue(hasCompleted)
  db.userAwardProgress.recordAwardProgress.mockResolvedValue({ data: {}, status: 'synced' })

  const defaultTimestamp = Math.floor(Date.now() / 1000)

  db.contentProgress.getOneProgressByContentId.mockResolvedValue({
    data: { state: 'completed', created_at: defaultTimestamp }
  })

  db.contentProgress.getSomeProgressByContentIds.mockResolvedValue({
    data: [{ created_at: defaultTimestamp - 86400 * 10 }]
  })

  db.contentProgress.queryOne.mockResolvedValue({
    data: { state: 'completed', created_at: defaultTimestamp }
  })

  db.contentProgress.queryAll.mockResolvedValue({
    data: [{ created_at: defaultTimestamp - 86400 * 10 }]
  })
}

export const setupAwardEventListeners = (awardEvents) => {
  const listeners = {
    progress: jest.fn(),
    granted: jest.fn()
  }

  awardEvents.on('awardProgress', listeners.progress)
  awardEvents.on('awardGranted', listeners.granted)

  return listeners
}
