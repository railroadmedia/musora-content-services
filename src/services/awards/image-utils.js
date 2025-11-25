/**
 * Convert image URL to base64 string
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64-encoded image (without data URI prefix)
 */
export async function urlToBase64(url) {
  try {
    if (!url) {
      return ''
    }

    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`)
      return ''
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        const base64String = reader.result
        const base64Data = base64String.split(',')[1]
        resolve(base64Data || '')
      }

      reader.onerror = () => {
        console.error(`Failed to convert image to base64: ${url}`)
        reject(new Error('Failed to convert image to base64'))
      }

      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(`Error converting URL to base64: ${url}`, error)
    return ''
  }
}

/**
 * Convert multiple image URLs to base64 in parallel
 * @param {Object<string, string>} urlMap - Object with keys as field names and values as URLs
 * @returns {Promise<Object<string, string>>} Object with same keys and base64 values
 */
export async function urlMapToBase64(urlMap) {
  const entries = Object.entries(urlMap)

  const results = await Promise.all(
    entries.map(async ([key, url]) => {
      const base64 = await urlToBase64(url)
      return [key, base64]
    })
  )

  return Object.fromEntries(results)
}
