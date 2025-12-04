import { AwardMessageGenerator } from '../../src/services/awards/internal/message-generator'

describe('AwardMessageGenerator', () => {
  const mockCompletionData = {
    content_title: 'Blues Foundations',
    completed_at: '2023-09-17T14:19:21.000Z',
    days_user_practiced: 14,
    practice_minutes: 180
  }

  describe('generatePopupMessage', () => {
    test('generates correct message with content title', () => {
      const message = AwardMessageGenerator.generatePopupMessage(mockCompletionData)

      expect(message).toContain('Blues Foundations')
      expect(message).toContain('14 days')
      expect(message).toContain('180 minutes')
    })

    test('uses correct practice time in message', () => {
      const customData = {
        ...mockCompletionData,
        practice_minutes: 450
      }

      const message = AwardMessageGenerator.generatePopupMessage(customData)

      expect(message).toContain('450 minutes')
      expect(message).not.toContain('180 minutes')
    })

    test('uses correct days in message', () => {
      const customData = {
        ...mockCompletionData,
        days_user_practiced: 30
      }

      const message = AwardMessageGenerator.generatePopupMessage(customData)

      expect(message).toContain('30 days')
      expect(message).not.toContain('14 days')
    })
  })

  describe('generateCertificateMessage', () => {
    test('generates certificate message without custom text', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData
      )

      expect(message).toContain('180 minutes')
      expect(message).toContain('Blues Foundations')
      expect(message).toContain('Well Done!')
      expect(message).toContain('certificate of completion')
    })

    test('includes custom text when provided', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData,
        'This is a bonus message.'
      )

      expect(message).toContain('This is a bonus message.')
      expect(message).toContain('180 minutes')
      expect(message).toContain('Blues Foundations')
    })

    test('handles custom text with proper spacing', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData,
        'Keep up the great work!'
      )

      expect(message).toContain('completion. Keep up the great work!')
      expect(message).not.toContain('  ')
    })

    test('works without custom text', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData,
        undefined
      )

      expect(message).toContain('completion.')
      expect(message).toContain('Well Done!')
      expect(message.includes('completion.. Well Done')).toBe(false)
    })

    test('includes content title from completion data', () => {
      const customData = {
        ...mockCompletionData,
        content_title: 'Advanced Jazz Techniques'
      }

      const message = AwardMessageGenerator.generateCertificateMessage(customData)

      expect(message).toContain('Advanced Jazz Techniques')
      expect(message).not.toContain('Blues Foundations')
    })

    test('includes practice minutes from completion data', () => {
      const customData = {
        ...mockCompletionData,
        practice_minutes: 500
      }

      const message = AwardMessageGenerator.generateCertificateMessage(customData)

      expect(message).toContain('500 minutes')
      expect(message).not.toContain('180 minutes')
    })
  })

  describe('edge cases', () => {
    test('handles zero practice minutes', () => {
      const zeroData = {
        ...mockCompletionData,
        practice_minutes: 0
      }

      const popupMessage = AwardMessageGenerator.generatePopupMessage(zeroData)
      const certMessage = AwardMessageGenerator.generateCertificateMessage(zeroData)

      expect(popupMessage).toContain('0 minutes')
      expect(certMessage).toContain('0 minutes')
    })

    test('handles single day practiced with correct grammar', () => {
      const oneDayData = {
        ...mockCompletionData,
        days_user_practiced: 1
      }

      const message = AwardMessageGenerator.generatePopupMessage(oneDayData)

      expect(message).toContain('1 day')
      expect(message).not.toContain('1 days')
    })

    test('handles very large practice times', () => {
      const largeData = {
        ...mockCompletionData,
        practice_minutes: 10000
      }

      const message = AwardMessageGenerator.generateCertificateMessage(largeData)

      expect(message).toContain('10000 minutes')
    })

    test('handles zero days practiced', () => {
      const zeroDaysData = {
        ...mockCompletionData,
        days_user_practiced: 0
      }

      const popupMessage = AwardMessageGenerator.generatePopupMessage(zeroDaysData)

      expect(popupMessage).toContain('0 days')
    })
  })
})
