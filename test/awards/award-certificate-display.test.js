import { buildCertificateData } from '../../src/services/awards/internal/certificate-builder'
import { mockAwardDefinitions, getAwardById } from '../mockData/award-definitions'
import { globalConfig } from '../../src/services/config'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/user/management', () => ({
  getUserData: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    userAwardProgress: {
      getByAwardId: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import { getUserData } from '../../src/services/user/management'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'

describe('Award Certificate Display - E2E Scenarios', () => {
  const testAward = getAwardById('0238b1e5-ebee-42b3-9390-91467d113575')
  const awardId = testAward._id

  beforeEach(async () => {
    jest.clearAllMocks()

    globalConfig.sessionConfig = {
      userId: 12345,
      token: 'test-token'
    }

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    db.userAwardProgress = {
      getByAwardId: jest.fn()
    }

    getUserData.mockResolvedValue({
      id: 12345,
      display_name: 'John Doe',
      name: 'John Doe',
      email: 'john@example.com'
    })

    await awardDefinitions.refresh()
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  describe('Scenario: Display complete certificate for earned award', () => {
    beforeEach(() => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardId,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000) - 86400 * 3,
          completion_data: {
            content_title: 'Adrian Guided Course Test',
            completed_at: new Date().toISOString(),
            days_user_practiced: 14,
            practice_minutes: 180
          },
        },
      })
    })

    test('returns complete certificate data with all fields', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate).toMatchObject({
        userId: 12345,
        userName: 'John Doe',
        completedAt: expect.any(String),
        awardId: awardId,
        awardType: 'content-award',
        awardTitle: testAward.name,
        popupMessage: expect.any(String),
        certificateMessage: expect.any(String),
        ribbonImage: expect.any(String),
        awardImage: testAward.award,
        badgeImage: testAward.badge,
        brandLogo: expect.any(String),
        musoraLogo: expect.any(String),
        musoraBgLogo: expect.any(String),
        instructorName: testAward.instructor_name
      })
    })

    test('includes correct user information from globalConfig and getUserData', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.userId).toBe(12345)
      expect(certificate.userName).toBe('John Doe')
    })

    test('includes correct award information from Sanity', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.awardId).toBe(awardId)
      expect(certificate.awardTitle).toBe('Adrian Guided Course Test Award')
      expect(certificate.badgeImage).toBe(testAward.badge)
      expect(certificate.awardImage).toBe(testAward.award)
      expect(certificate.instructorName).toBe('Aaron Graham')
    })

    test('includes client-generated popup message', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.popupMessage).toContain('Adrian Guided Course Test')
      expect(certificate.popupMessage).toContain('180 minutes')
      expect(certificate.popupMessage).toContain('14 days')
    })

    test('includes client-generated certificate message', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.certificateMessage).toContain('180 minutes')
      expect(certificate.certificateMessage).toContain('Adrian Guided Course Test')
      expect(certificate.certificateMessage).toContain('Well Done!')
    })

    test('includes brand logo based on award brand', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.brandLogo).toBeDefined()
      expect(typeof certificate.brandLogo).toBe('string')
    })

    test('includes completion date from WatermelonDB', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.completedAt).toBeDefined()
      const completedDate = new Date(certificate.completedAt)
      expect(completedDate).toBeInstanceOf(Date)
      expect(completedDate.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('Scenario: Certificate with custom award text', () => {
    const awardWithCustomText = getAwardById('0f49cb6a-1b23-4628-968e-15df02ffad7f')

    beforeEach(() => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardWithCustomText._id,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: {
            content_title: 'Enrolling w/ Kickoff, has product GC (EC)',
            completed_at: new Date().toISOString(),
            days_user_practiced: 10,
            practice_minutes: 200
          },
        },
      })
    })

    test('includes custom text in certificate message', async () => {
      const certificate = await buildCertificateData(awardWithCustomText._id)

      expect(certificate.certificateMessage).toContain('Huzzah congratz')
      expect(certificate.certificateMessage).toContain('200 minutes')
      expect(certificate.certificateMessage).toContain('Enrolling w/ Kickoff, has product GC (EC)')
    })
  })

  describe('Scenario: Certificate with null instructor signature', () => {
    const awardWithoutSignature = getAwardById('0f49cb6a-1b23-4628-968e-15df02ffad7f')

    beforeEach(() => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardWithoutSignature._id,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: {
            content_title: 'Test Course',
            completed_at: new Date().toISOString(),
            days_user_practiced: 5,
            practice_minutes: 100
          },
        },
      })
    })

    test('handles null instructor signature gracefully', async () => {
      const certificate = await buildCertificateData(awardWithoutSignature._id)

      expect(certificate.instructorName).toBe('Lisa Witt')
    })
  })

  describe('Scenario: User with no display_name falls back to name', () => {
    beforeEach(() => {
      getUserData.mockResolvedValue({
        id: 12345,
        display_name: null,
        name: 'Jane Smith',
        email: 'jane@example.com'
      })

      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardId,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: {
            content_title: 'Test Course',
            completed_at: new Date().toISOString(),
            days_user_practiced: 7,
            practice_minutes: 150
          },
        },
      })
    })

    test('uses name field when display_name is null', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.userName).toBe('Jane Smith')
    })
  })

  describe('Scenario: User with neither display_name nor name', () => {
    beforeEach(() => {
      getUserData.mockResolvedValue({
        id: 12345,
        display_name: null,
        name: null,
        email: 'anonymous@example.com'
      })

      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardId,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: {
            content_title: 'Test Course',
            completed_at: new Date().toISOString(),
            days_user_practiced: 3,
            practice_minutes: 90
          },
        },
      })
    })

    test('falls back to "User" when no name available', async () => {
      const certificate = await buildCertificateData(awardId)

      expect(certificate.userName).toBe('User')
    })
  })

  describe('Scenario: Error handling', () => {
    test('throws error when award definition not found', async () => {
      await expect(
        buildCertificateData('non-existent-award-id')
      ).rejects.toThrow('Award definition not found')
    })

    test('throws error when completion data not found in local DB', async () => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: null
      })

      await expect(
        buildCertificateData(awardId)
      ).rejects.toThrow('Completion data not found')
    })

    test('throws error when completion_data is missing', async () => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: awardId,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: null
        },
      })

      await expect(
        buildCertificateData(awardId)
      ).rejects.toThrow('Completion data not found')
    })
  })

  describe('Scenario: Learning path vs guided course message differences', () => {
    const learningPathAward = getAwardById('361f3034-c6c9-45f7-bbfb-0d58dbe14411')

    beforeEach(() => {
      db.userAwardProgress.getByAwardId.mockResolvedValue({
        data: {
          award_id: learningPathAward._id,
          progress_percentage: 100,
          completed_at: Math.floor(Date.now() / 1000),
          completion_data: {
            content_title: 'Learn To Play The Drums',
            completed_at: new Date().toISOString(),
            days_user_practiced: 30,
            practice_minutes: 600
          },
        },
      })
    })

    test('generates learning path message for learning path award', async () => {
      const certificate = await buildCertificateData(learningPathAward._id)

      expect(certificate.popupMessage).toContain('Learn To Play The Drums')
      expect(certificate.popupMessage).toContain('600 minutes')
      expect(certificate.popupMessage).toContain('30 days')
    })
  })
})
