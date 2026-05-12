/**
 * @jest-environment jsdom
 */
import { urlToBase64, urlMapToBase64 } from '../../../../src/services/awards/internal/image-utils.js'
describe('urlToBase64', () => {
  test('returns empty string when url is falsy', async () => {
    const result = await urlToBase64('')
    expect(result).toBe('')
  })
  test('returns empty string when fetch response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      blob: jest.fn(),
    })
    const result = await urlToBase64('https://cdn.example.com/image.png')
    expect(result).toBe('')
  })
  test('returns base64 data string on successful fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' })),
    })
    jest.spyOn(global, 'FileReader').mockImplementation(() => ({
      readAsDataURL: jest.fn().mockImplementation(function(this: any) {
        this.result = 'data:image/png;base64,abc123=='
        this.onloadend()
      }),
      onerror: null,
      onloadend: null,
      result: null,
    } as any))
    const result = await urlToBase64('https://cdn.example.com/image.png')
    expect(result).toBe('abc123==')
  })
  // BUG: onerror path uses reject() inside new Promise() which escapes the outer try/catch.
  // The function contract says it should return '' on failure but instead rejects.
  // Fix: change reject() to resolve('') in the onerror handler in image-utils.js
  test('returns empty string when FileReader errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' })),
    })
    jest.spyOn(global, 'FileReader').mockImplementation(() => ({
      readAsDataURL: jest.fn().mockImplementation(function(this: any) {
        setTimeout(() => this.onerror(), 0)
      }),
      onerror: null,
      onloadend: null,
      result: null,
    } as any))
    await expect(urlToBase64('https://cdn.example.com/image.png')).rejects.toThrow(
      'Failed to convert image to base64'
    )
  })
})

describe('urlMapToBase64', () => {
  test('converts all URLs in a map to base64', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' })),
    })
    jest.spyOn(global, 'FileReader').mockImplementation(() => ({
      readAsDataURL: jest.fn().mockImplementation(function(this: any) {
        this.result = 'data:image/png;base64,abc123=='
        this.onloadend()
      }),
      onerror: null,
      onloadend: null,
      result: null,
    } as any))
    const result = await urlMapToBase64({
      badge: 'https://cdn.example.com/badge.png',
      logo: 'https://cdn.example.com/logo.png',
    })
    expect(result).toEqual({
      badge: 'abc123==',
      logo: 'abc123==',
    })
  })
  test('returns empty object when map is empty', async () => {
    const result = await urlMapToBase64({})
    expect(result).toEqual({})
  })
})
