import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import schema, { SYNC_TABLES } from '../../src/services/sync/schema'
import ContentProgress from '../../src/services/sync/models/ContentProgress'
import ContentPractice from '../../src/services/sync/models/ContentPractice'
import UserAwardProgress from '../../src/services/sync/models/UserAwardProgress'
import { contentProgressObserver } from '../../src/services/awards/content-progress-observer'
import { awardManager } from '../../src/services/awards/award-manager'
import { awardEvents } from '../../src/services/awards/award-events'
import { awardDefinitions } from '../../src/services/awards/award-definitions'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockSyncTables = {
    CONTENT_PROGRESS: 'progress',
    CONTENT_PRACTICES: 'practice',
    USER_AWARD_PROGRESS: 'user_award_progress'
  }

  let testDatabase = null

  const createProxy = () => ({
    contentProgress: {
      queryOne: async (...clauses) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.CONTENT_PROGRESS)
        const record = await collection.query(...clauses).fetch().then(r => r[0] || null)
        return { data: record ? {
          state: record.state,
          created_at: record.created_at,
          progress_percent: record.progress_percent,
          content_id: record.content_id
        } : null }
      },
      queryAll: async (...clauses) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.CONTENT_PROGRESS)
        const records = await collection.query(...clauses).fetch()
        return { data: records.map(r => ({
          created_at: r.created_at,
          state: r.state,
          content_id: r.content_id
        }))}
      }
    },
    contentPractices: {
      sumPracticeMinutesForContent: async (contentIds) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.CONTENT_PRACTICES)
        const { Q } = require('@nozbe/watermelondb')
        const practices = await collection.query(
          Q.where('content_id', Q.oneOf(contentIds))
        ).fetch()
        const totalSeconds = practices.reduce((sum, p) => sum + p.duration_seconds, 0)
        return Math.round(totalSeconds / 60)
      }
    },
    userAwardProgress: {
      hasCompletedAward: async (awardId) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.USER_AWARD_PROGRESS)
        try {
          const record = await collection.find(awardId)
          return record.isCompleted
        } catch (e) {
          return false
        }
      },
      recordAwardProgress: async (awardId, progressPercentage, options = {}) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.USER_AWARD_PROGRESS)
        const now = Math.floor(Date.now() / 1000)

        await testDatabase.write(async () => {
          try {
            const existing = await collection.find(awardId)
            await existing.update(record => {
              record._raw.progress_percentage = progressPercentage
              if (options.progressData) {
                record._raw.progress_data = JSON.stringify(options.progressData)
              }
              if (options.completedAt !== undefined) {
                record._raw.completed_at = options.completedAt
              }
              if (options.completionData) {
                record._raw.completion_data = JSON.stringify(options.completionData)
              }
              record._raw.updated_at = now
            })
          } catch (e) {
            await collection.create(record => {
              record._raw.id = awardId
              record._raw.award_id = awardId
              record._raw.progress_percentage = progressPercentage
              record._raw.progress_data = options.progressData ? JSON.stringify(options.progressData) : null
              record._raw.completed_at = options.completedAt || null
              record._raw.completion_data = options.completionData ? JSON.stringify(options.completionData) : null
              record._raw.created_at = now
              record._raw.updated_at = now
              record._raw._status = 'synced'
            })
          }
        })

        return { data: {}, status: 'synced' }
      },
      completeAward: async (awardId, completionData) => {
        if (!testDatabase) throw new Error('Test database not initialized')
        const collection = testDatabase.collections.get(mockSyncTables.USER_AWARD_PROGRESS)
        const now = Math.floor(Date.now() / 1000)

        await testDatabase.write(async () => {
          try {
            const existing = await collection.find(awardId)
            await existing.update(record => {
              record._raw.progress_percentage = 100
              record._raw.completed_at = now
              record._raw.completion_data = JSON.stringify(completionData)
              record._raw.updated_at = now
            })
          } catch (e) {
            await collection.create(record => {
              record._raw.id = awardId
              record._raw.award_id = awardId
              record._raw.progress_percentage = 100
              record._raw.completed_at = now
              record._raw.completion_data = JSON.stringify(completionData)
              record._raw.progress_data = null
              record._raw.created_at = now
              record._raw.updated_at = now
              record._raw._status = 'synced'
            })
          }
        })

        return { data: {}, status: 'synced' }
      }
    }
  })

  const proxy = createProxy()
  proxy.__setTestDatabase = (db) => { testDatabase = db }

  return { default: proxy, ...proxy }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { SYNC_TABLES as TABLES } from '../../src/services/sync/schema'
import ContentLike from '../../src/services/sync/models/ContentLike'

describe('Award System - Observer Integration (Simplified)', () => {
  let database
  let progressCollection
  let practiceCollection
  let awardProgressCollection
  let awardGrantedListener
  let awardProgressListener

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    const adapter = new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `test_${Date.now()}_${Math.random()}`,
      extraLokiOptions: {
        autosave: false
      }
    })

    database = new Database({
      adapter,
      modelClasses: [ContentProgress, ContentPractice, ContentLike, UserAwardProgress]
    })

    db.__setTestDatabase(database)

    progressCollection = database.collections.get(TABLES.CONTENT_PROGRESS)
    practiceCollection = database.collections.get(TABLES.CONTENT_PRACTICES)
    awardProgressCollection = database.collections.get(TABLES.USER_AWARD_PROGRESS)

    await awardDefinitions.refresh()

    awardGrantedListener = jest.fn()
    awardProgressListener = jest.fn()
    awardEvents.on('awardGranted', awardGrantedListener)
    awardEvents.on('awardProgress', awardProgressListener)
  })

  afterEach(async () => {
    contentProgressObserver.stop()
    awardEvents.removeAllListeners()
    awardDefinitions.clear()

    if (database) {
      try {
        await database.write(async () => {
          await database.unsafeResetDatabase()
        })
      } catch (error) {
        console.error('Error resetting database:', error)
      }
    }
  })

  describe('Browser Flow: Complete 4-Lesson Course', () => {
    const courseId = 417049
    const testAward = getAwardByContentId(courseId)
    const kickoffLessonId = 417030
    const lessonIds = [417045, 417046, 417047, 417048]

    test('completes course progressively and earns award', async () => {
      await contentProgressObserver.start(database)

      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = `${kickoffLessonId}`
          record._raw.content_id = kickoffLessonId
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'completed'
          record._raw.progress_percent = 100
          record._raw.resume_time_seconds = 0
          record._raw.created_at = now - 86400
          record._raw.updated_at = now - 86400
          record._raw._status = 'synced'
        })
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      for (let i = 0; i < lessonIds.length; i++) {
        const lessonId = lessonIds[i]

        await database.write(async () => {
          await progressCollection.create(record => {
            record._raw.id = `${lessonId}`
            record._raw.content_id = lessonId
            record._raw.content_brand = 'drumeo'
            record._raw.state = 'started'
            record._raw.progress_percent = 0
            record._raw.resume_time_seconds = 0
            record._raw.created_at = now
            record._raw.updated_at = now
            record._raw._status = 'synced'
          })
        })

        await database.write(async () => {
          await practiceCollection.create(record => {
            record._raw.id = `practice_${lessonId}_${now}`
            record._raw.content_id = lessonId
            record._raw.duration_seconds = 600
            record._raw.created_at = now
            record._raw.updated_at = now
            record._raw._status = 'synced'
          })
        })

        await database.write(async () => {
          const lesson = await progressCollection.find(`${lessonId}`)
          await lesson.update(record => {
            record._raw.state = 'completed'
            record._raw.progress_percent = 100
            record._raw.updated_at = now + 100
          })
        })

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)

      const grantedPayload = awardGrantedListener.mock.calls[0][0]
      expect(grantedPayload.awardId).toBe(testAward._id)
      expect(grantedPayload.completionData).toMatchObject({
        content_title: expect.any(String),
        completed_at: expect.any(String),
        days_user_practiced: expect.any(Number),
        practice_minutes: expect.any(Number)
      })
      expect(grantedPayload.popupMessage).toContain('Great job')

      const savedAward = await awardProgressCollection.find(testAward._id)
      expect(savedAward.progress_percentage).toBe(100)
      expect(savedAward.completed_at).not.toBeNull()
      expect(savedAward.completion_data).not.toBeNull()
    }, 10000)

    test('tracks progress_data correctly', async () => {
      await contentProgressObserver.start(database)

      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        for (const lessonId of [kickoffLessonId, ...lessonIds.slice(0, 2)]) {
          await progressCollection.create(record => {
            record._raw.id = `${lessonId}`
            record._raw.content_id = lessonId
            record._raw.content_brand = 'drumeo'
            record._raw.state = 'completed'
            record._raw.progress_percent = 100
            record._raw.resume_time_seconds = 0
            record._raw.created_at = now
            record._raw.updated_at = now
            record._raw._status = 'synced'
          })
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const savedAward = await awardProgressCollection.find(testAward._id)
      expect(savedAward.progress_percentage).toBe(50)
      expect(savedAward.progress_data).not.toBeNull()
      expect(savedAward.progress_data.completedLessonIds).toContain(417045)
      expect(savedAward.progress_data.completedLessonIds).toContain(417046)
      expect(savedAward.progress_data.completedCount).toBe(2)
      expect(savedAward.progress_data.totalLessons).toBe(4)
    }, 10000)
  })

  describe('Browser Flow: Already Completed Award', () => {
    const courseId = 416446
    const testAward = getAwardByContentId(courseId)

    test('does not re-grant completed award', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = testAward._id
          record._raw.award_id = testAward._id
          record._raw.progress_percentage = 100
          record._raw.completed_at = now - 86400
          record._raw.completion_data = JSON.stringify({
            content_title: 'Test',
            completed_at: new Date().toISOString(),
            days_user_practiced: 7,
            practice_minutes: 100
          })
          record._raw.progress_data = null
          record._raw.created_at = now - 86400
          record._raw.updated_at = now - 86400
          record._raw._status = 'synced'
        })
      })

      await contentProgressObserver.start(database)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = `${testAward.child_ids[1]}`
          record._raw.content_id = testAward.child_ids[1]
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'completed'
          record._raw.progress_percent = 100
          record._raw.resume_time_seconds = 0
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('Browser Flow: Learning Path Award', () => {
    const courseId = 417140
    const testAward = getAwardByContentId(courseId)

    test('completes learning path with correct message', async () => {
      await contentProgressObserver.start(database)

      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        for (const lessonId of testAward.child_ids) {
          await progressCollection.create(record => {
            record._raw.id = `${lessonId}`
            record._raw.content_id = lessonId
            record._raw.content_brand = 'drumeo'
            record._raw.state = 'completed'
            record._raw.progress_percent = 100
            record._raw.resume_time_seconds = 0
            record._raw.created_at = now
            record._raw.updated_at = now
            record._raw._status = 'synced'
          })
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload.popupMessage).toContain('learning path')
      expect(payload.popupMessage).not.toContain('guided course')
    }, 10000)
  })

  describe('Observer Behavior', () => {
    test('observer starts and stops cleanly', async () => {
      const cleanup = await contentProgressObserver.start(database)
      expect(contentProgressObserver.isObserving).toBe(true)

      cleanup()
      expect(contentProgressObserver.isObserving).toBe(false)
    })

    test('observer ignores non-award lessons', async () => {
      await contentProgressObserver.start(database)

      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = '999999'
          record._raw.content_id = 999999
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'completed'
          record._raw.progress_percent = 100
          record._raw.resume_time_seconds = 0
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).not.toHaveBeenCalled()
      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })
})
