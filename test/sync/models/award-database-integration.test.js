import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { Q } from '@nozbe/watermelondb'
import schema, { SYNC_TABLES } from '../../../src/services/sync/schema'
import ContentProgress from '../../../src/services/sync/models/ContentProgress'
import Practice from '../../../src/services/sync/models/Practice'
import ContentLike from '../../../src/services/sync/models/ContentLike'
import UserAwardProgress from '../../../src/services/sync/models/UserAwardProgress'

describe('Award System - Direct Database Integration', () => {
  let database
  let progressCollection
  let practiceCollection
  let awardProgressCollection

  beforeEach(async () => {
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
      modelClasses: [ContentProgress, Practice, ContentLike, UserAwardProgress]
    })

    progressCollection = database.collections.get(SYNC_TABLES.CONTENT_PROGRESS)
    practiceCollection = database.collections.get(SYNC_TABLES.PRACTICES)
    awardProgressCollection = database.collections.get(SYNC_TABLES.USER_AWARD_PROGRESS)
  })

  afterEach(async () => {
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

  describe('ContentProgress CRUD Operations', () => {
    test('creates a progress record with started state', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = '417045'
          record._raw.content_id = 417045
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'started'
          record._raw.progress_percent = 50
          record._raw.resume_time_seconds = 120
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const record = await progressCollection.find('417045')
      expect(record.content_id).toBe(417045)
      expect(record.state).toBe('started')
      expect(record.progress_percent).toBe(50)
    })

    test('updates progress record to completed state', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = '417045'
          record._raw.content_id = 417045
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'started'
          record._raw.progress_percent = 50
          record._raw.resume_time_seconds = 0
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      await database.write(async () => {
        const record = await progressCollection.find('417045')
        await record.update(r => {
          r._raw.state = 'completed'
          r._raw.progress_percent = 100
          r._raw.updated_at = now + 100
        })
      })

      const updated = await progressCollection.find('417045')
      expect(updated.state).toBe('completed')
      expect(updated.progress_percent).toBe(100)
    })

    test('queries multiple completed lessons', async () => {
      const now = Math.floor(Date.now() / 1000)
      const lessonIds = [417045, 417046, 417047]

      await database.write(async () => {
        for (const lessonId of lessonIds) {
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

      const completed = await progressCollection
        .query(Q.where('state', 'completed'))
        .fetch()

      expect(completed.length).toBe(3)
      expect(completed.map(r => r.content_id)).toEqual(expect.arrayContaining(lessonIds))
    })

    test('filters by content_id', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await progressCollection.create(record => {
          record._raw.id = '417045'
          record._raw.content_id = 417045
          record._raw.content_brand = 'drumeo'
          record._raw.state = 'completed'
          record._raw.progress_percent = 100
          record._raw.resume_time_seconds = 0
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const results = await progressCollection
        .query(Q.where('content_id', 417045))
        .fetch()

      expect(results.length).toBe(1)
      expect(results[0].content_id).toBe(417045)
    })
  })

  describe('ContentPractice Operations', () => {
    test('creates practice session record', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await practiceCollection.create(record => {
          record._raw.id = `practice_417045_${now}`
          record._raw.content_id = 417045
          record._raw.duration_seconds = 1200
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const records = await practiceCollection
        .query(Q.where('content_id', 417045))
        .fetch()

      expect(records.length).toBe(1)
      expect(records[0].duration_seconds).toBe(1200)
    })

    test('queries practice sessions for multiple lessons', async () => {
      const now = Math.floor(Date.now() / 1000)
      const lessonIds = [417045, 417046, 417047]

      await database.write(async () => {
        for (const lessonId of lessonIds) {
          await practiceCollection.create(record => {
            record._raw.id = `practice_${lessonId}_${now}`
            record._raw.content_id = lessonId
            record._raw.duration_seconds = 600
            record._raw.created_at = now
            record._raw.updated_at = now
            record._raw._status = 'synced'
          })
        }
      })

      const allPractices = await practiceCollection
        .query(Q.where('content_id', Q.oneOf(lessonIds)))
        .fetch()

      expect(allPractices.length).toBe(3)
    })

    test('calculates total practice time for lessons', async () => {
      const now = Math.floor(Date.now() / 1000)
      const lessonId = 417045

      await database.write(async () => {
        await practiceCollection.create(record => {
          record._raw.id = `practice_${lessonId}_1`
          record._raw.content_id = lessonId
          record._raw.duration_seconds = 600
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })

        await practiceCollection.create(record => {
          record._raw.id = `practice_${lessonId}_2`
          record._raw.content_id = lessonId
          record._raw.duration_seconds = 900
          record._raw.created_at = now + 3600
          record._raw.updated_at = now + 3600
          record._raw._status = 'synced'
        })
      })

      const practices = await practiceCollection
        .query(Q.where('content_id', lessonId))
        .fetch()

      const totalSeconds = practices.reduce((sum, p) => sum + p.duration_seconds, 0)
      const totalMinutes = Math.round(totalSeconds / 60)

      expect(totalMinutes).toBe(25)
    })
  })

  describe('UserAwardProgress Operations', () => {
    test('creates award progress record with 0%', async () => {
      const now = Math.floor(Date.now() / 1000)
      const awardId = 'test-award-123'

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = awardId
          record._raw.award_id = awardId
          record._raw.progress_percentage = 0
          record._raw.completed_at = null
          record._raw.progress_data = null
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const record = await awardProgressCollection.find(awardId)
      expect(record.progress_percentage).toBe(0)
      expect(record.completed_at).toBeNull()
    })

    test('updates award progress with progress_data', async () => {
      const now = Math.floor(Date.now() / 1000)
      const awardId = 'test-award-123'

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = awardId
          record._raw.award_id = awardId
          record._raw.progress_percentage = 0
          record._raw.completed_at = null
          record._raw.progress_data = null
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const progressData = {
        completedLessonIds: [417045, 417046],
        totalLessons: 4,
        completedCount: 2
      }

      await database.write(async () => {
        const record = await awardProgressCollection.find(awardId)
        await record.update(r => {
          r._raw.progress_percentage = 50
          r._raw.progress_data = JSON.stringify(progressData)
          r._raw.updated_at = now + 100
        })
      })

      const updated = await awardProgressCollection.find(awardId)
      expect(updated.progress_percentage).toBe(50)
      expect(updated.progress_data).toEqual(progressData)
      expect(updated.progress_data.completedLessonIds).toEqual([417045, 417046])
    })

    test('completes award with completion_data', async () => {
      const now = Math.floor(Date.now() / 1000)
      const awardId = 'test-award-123'

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = awardId
          record._raw.award_id = awardId
          record._raw.progress_percentage = 50
          record._raw.completed_at = null
          record._raw.progress_data = JSON.stringify({
            completedLessonIds: [417045, 417046],
            totalLessons: 4,
            completedCount: 2
          })
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const completionData = {
        content_title: 'Blues Foundations',
        completed_at: new Date().toISOString(),
        days_user_practiced: 7,
        practice_minutes: 180
      }

      await database.write(async () => {
        const record = await awardProgressCollection.find(awardId)
        await record.update(r => {
          r._raw.progress_percentage = 100
          r._raw.completed_at = now + 200
          r._raw.completion_data = JSON.stringify(completionData)
          r._raw.updated_at = now + 200
        })
      })

      const completed = await awardProgressCollection.find(awardId)
      expect(completed.progress_percentage).toBe(100)
      expect(completed.completed_at).toBe(now + 200)
      expect(completed.completion_data).toEqual(completionData)
      expect(completed.isCompleted).toBe(true)
    })

    test('queries in-progress awards', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = 'award-1'
          record._raw.award_id = 'award-1'
          record._raw.progress_percentage = 50
          record._raw.completed_at = null
          record._raw.progress_data = null
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })

        await awardProgressCollection.create(record => {
          record._raw.id = 'award-2'
          record._raw.award_id = 'award-2'
          record._raw.progress_percentage = 100
          record._raw.completed_at = now
          record._raw.progress_data = null
          record._raw.completion_data = JSON.stringify({})
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const inProgress = await awardProgressCollection
        .query(
          Q.where('progress_percentage', Q.gt(0)),
          Q.where('completed_at', Q.eq(null))
        )
        .fetch()

      expect(inProgress.length).toBe(1)
      expect(inProgress[0].award_id).toBe('award-1')
    })

    test('queries completed awards', async () => {
      const now = Math.floor(Date.now() / 1000)

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = 'award-1'
          record._raw.award_id = 'award-1'
          record._raw.progress_percentage = 100
          record._raw.completed_at = now
          record._raw.progress_data = null
          record._raw.completion_data = JSON.stringify({})
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })

        await awardProgressCollection.create(record => {
          record._raw.id = 'award-2'
          record._raw.award_id = 'award-2'
          record._raw.progress_percentage = 50
          record._raw.completed_at = null
          record._raw.progress_data = null
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const completed = await awardProgressCollection
        .query(Q.where('completed_at', Q.notEq(null)))
        .fetch()

      expect(completed.length).toBe(1)
      expect(completed[0].award_id).toBe('award-1')
      expect(completed[0].isCompleted).toBe(true)
    })
  })

  describe('Cross-Collection Queries', () => {
    test('finds progress and practice for same lesson', async () => {
      const now = Math.floor(Date.now() / 1000)
      const lessonId = 417045

      await database.write(async () => {
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

        await practiceCollection.create(record => {
          record._raw.id = `practice_${lessonId}`
          record._raw.content_id = lessonId
          record._raw.duration_seconds = 1200
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const progress = await progressCollection.find(`${lessonId}`)
      const practices = await practiceCollection
        .query(Q.where('content_id', lessonId))
        .fetch()

      expect(progress.state).toBe('completed')
      expect(practices.length).toBe(1)
      expect(practices[0].duration_seconds).toBe(1200)
    })

    test('simulates award progress flow: lessons → award progress', async () => {
      const now = Math.floor(Date.now() / 1000)
      const awardId = 'test-award-123'
      const lessonIds = [417045, 417046, 417047, 417048]

      await database.write(async () => {
        for (const lessonId of lessonIds.slice(0, 2)) {
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

      const completedLessons = await progressCollection
        .query(
          Q.where('content_id', Q.oneOf(lessonIds)),
          Q.where('state', 'completed')
        )
        .fetch()

      const progressPercentage = Math.round((completedLessons.length / lessonIds.length) * 100)

      await database.write(async () => {
        await awardProgressCollection.create(record => {
          record._raw.id = awardId
          record._raw.award_id = awardId
          record._raw.progress_percentage = progressPercentage
          record._raw.completed_at = null
          record._raw.progress_data = JSON.stringify({
            completedLessonIds: completedLessons.map(l => l.content_id),
            totalLessons: lessonIds.length,
            completedCount: completedLessons.length
          })
          record._raw.completion_data = null
          record._raw.created_at = now
          record._raw.updated_at = now
          record._raw._status = 'synced'
        })
      })

      const award = await awardProgressCollection.find(awardId)
      expect(award.progress_percentage).toBe(50)
      expect(award.progress_data.completedCount).toBe(2)
    })
  })
})
