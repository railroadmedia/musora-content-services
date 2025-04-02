/**
 * Verifies if an image URL follows best practices for optimization
 *
 * This function checks whether:
 * 1. Sanity CDN images include query parameters for optimization
 * 2. Direct S3 images are avoided (should use CDN instead)
 *
 * @param {string} src - The image source URL to verify
 * @returns {void}
 *
 * @example
 * // Check a direct Sanity URL
 * verifyImageSRC('https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg');
 *
 * @example
 * // Check a Sanity URL inside a Cloudflare URL
 * verifyImageSRC('https://www.musora.com/cdn-cgi/image/width=500,quality=95/https://cdn.sanity.io/images/4032r8py/staging/504c4e3393170f937a579de6f3c75c457b0c9e65-640x360.jpg');
 */
export function verifyImageSRC(src) {
  // Exit early if the URL is empty
  if (!src) return

  // Check for S3 direct URLs
  if (isBucketUrl(src)) {
    warnAboutDirectS3Url(src)
    return
  }

  // Check for Sanity URLs
  if (src.includes('cdn.sanity.io')) {
    verifySanityUrl(src)
  }
}

/**
 * Checks if a URL is a direct link to an S3 bucket
 *
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a direct S3 bucket URL
 * @private
 */
export function isBucketUrl(url) {
  // Check for common S3 patterns
  return (
    url.includes('.s3.amazonaws.com') ||
    url.includes('s3.us-') ||
    url.includes('amazonaws.com/') ||
    (url.includes('musora-') && url.includes('.s3.'))
  )
}

/**
 * Issues a warning about using direct S3 URLs instead of a CDN
 *
 * @param {string} url - The S3 URL that triggered the warning
 * @private
 */
function warnAboutDirectS3Url(url) {
  // Only warn in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`WARNING: Direct S3 bucket URL detected: ${url}
    This is not recommended. Use Cloudfront or another CDN for better performance.`)
  }
}

/**
 * Extracts a Sanity URL from a potentially Cloudflare-wrapped URL
 *
 * @param {string} url - The URL to process
 * @returns {string} The extracted Sanity URL
 * @private
 */
export function extractSanityUrl(url) {
  // If this is a Cloudflare URL, extract the Sanity portion
  if (url.includes('/cdn-cgi/image/')) {
    // Split the URL to get the portion after /cdn-cgi/image/[parameters]/
    const parts = url.split('/cdn-cgi/image/')
    if (parts.length > 1) {
      // Get everything after the first / that follows the Cloudflare parameters
      const cfParamsAndSanityUrl = parts[1]
      const slashIndex = cfParamsAndSanityUrl.indexOf('/', 0)
      if (slashIndex !== -1) {
        let sanityUrl = cfParamsAndSanityUrl.substring(slashIndex + 1)
        return sanityUrl
      }
    }
  }

  // If not a Cloudflare URL or extraction failed, return the original URL
  return url
}

/**
 * Verifies if a Sanity CDN image URL includes optimization parameters
 *
 * @param {string} src - The Sanity image URL to verify
 * @private
 */
function verifySanityUrl(src) {
  // Extract the Sanity URL if it's wrapped in a Cloudflare URL
  const sanityUrl = extractSanityUrl(src)

  // Check if the Sanity URL has parameters (any query string)
  const hasParameters = sanityUrl.includes('?')

  // Warn if no parameters are found
  if (!hasParameters) {
    // Only warn in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`WARNING: Sanity CDN URL without parameters detected: ${src}
    This may cause performance issues. Consider adding image transformations using the buildImageSRC MCS service.`)
    }
  }
}
