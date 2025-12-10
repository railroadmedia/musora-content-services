// Mock console.warn to avoid cluttering test output and to verify warnings
import { extractSanityUrl, isBucketUrl, verifyImageSRC } from '../src/services/imageSRCVerify.js'

const originalConsoleWarn = console.warn
const originalConsoleError = console.error
const originalNodeEnv = process.env.NODE_ENV

describe('Image URL Verification', () => {
  let consoleWarnMock

  beforeEach(() => {
    // Mock console.warn and console.error
    consoleWarnMock = jest.fn()
    console.warn = consoleWarnMock
    console.error = jest.fn()

    // Set NODE_ENV to development for all tests
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    // Restore the original console methods and NODE_ENV
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('verifyImageSRC', () => {
    test('should not warn for Sanity URL with parameters', () => {
      // Arrange
      const url =
        'https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg?w=500&q=95'

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).not.toHaveBeenCalled()
    })

    test('should warn for Sanity URL without parameters', () => {
      // Arrange
      const url =
        'https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg'

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).toHaveBeenCalled()
      expect(consoleWarnMock.mock.calls[0][0]).toContain(
        'WARNING: Sanity CDN URL without parameters detected'
      )
    })

    test('should warn for direct S3 bucket URL', () => {
      // Arrange
      const url = 'https://musora-images.s3.amazonaws.com/drumeo/images/some-image.jpg'

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).toHaveBeenCalled()
      expect(consoleWarnMock.mock.calls[0][0]).toContain('Direct S3 bucket URL detected')
    })

    test('should not warn when URL is empty', () => {
      // Arrange
      const url = ''

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).not.toHaveBeenCalled()
    })
  })

  describe('Cloudflare wrapped Sanity URLs', () => {
    test('should extract and validate Sanity URL from Cloudflare wrapper', () => {
      // Arrange
      const url =
        'https://www.musora.com/cdn-cgi/image/width=500,quality=95/https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg'

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).toHaveBeenCalled()
      expect(consoleWarnMock.mock.calls[0][0]).toContain(
        'WARNING: Sanity CDN URL without parameters detected'
      )
    })

    test('should not warn for Cloudflare wrapped Sanity URL with parameters', () => {
      // Arrange
      const url =
        'https://www.musora.com/cdn-cgi/image/width=500,quality=95/https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg?w=500&q=95'

      // Act
      verifyImageSRC(url)

      // Assert
      expect(consoleWarnMock).not.toHaveBeenCalled()
    })
  })

  describe('isBucketUrl', () => {
    test('should detect standard S3 URLs', () => {
      // Arrange & Act & Assert
      expect(isBucketUrl('https://my-bucket.s3.amazonaws.com/image.jpg')).toBe(true)
      expect(isBucketUrl('https://s3.us-east-1.amazonaws.com/my-bucket/image.jpg')).toBe(true)
      expect(isBucketUrl('https://musora-images.s3.amazonaws.com/path/to/image.jpg')).toBe(true)
    })

    test('should not flag non-S3 URLs', () => {
      // Arrange & Act & Assert
      expect(isBucketUrl('https://cdn.sanity.io/images/123/production/image.jpg')).toBe(false)
      expect(isBucketUrl('https://www.musora.com/image.jpg')).toBe(false)
    })
  })

  describe('extractSanityUrl', () => {
    test('should extract Sanity URL from Cloudflare wrapper', () => {
      // Arrange
      const wrappedUrl =
        'https://www.musora.com/cdn-cgi/image/width=500,quality=95/https://cdn.sanity.io/images/123/production/image.jpg'
      const expectedExtracted = 'https://cdn.sanity.io/images/123/production/image.jpg'

      // Act
      const result = extractSanityUrl(wrappedUrl)

      // Assert
      expect(result).toBe(expectedExtracted)
    })

    test('should return original URL if not Cloudflare wrapped', () => {
      // Arrange
      const url = 'https://cdn.sanity.io/images/123/production/image.jpg'

      // Act
      const result = extractSanityUrl(url)

      // Assert
      expect(result).toBe(url)
    })

    test('should handle malformed Cloudflare URLs gracefully', () => {
      // Arrange
      const malformedUrl = 'https://www.musora.com/cdn-cgi/image/width=500'

      // Act
      const result = extractSanityUrl(malformedUrl)

      // Assert
      expect(result).toBe(malformedUrl)
    })
  })
})
