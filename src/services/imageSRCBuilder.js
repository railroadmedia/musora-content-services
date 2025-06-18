/**
 * Builds an optimized image URL using both Sanity and Cloudflare Image Resizing services
 *
 * This function takes a Sanity CDN URL and image transformation parameters, then:
 * 1. Adds appropriate transformation parameters to the Sanity URL
 * 2. Wraps the resulting URL with Cloudflare's Image Resizing service
 * 3. Maps compatible parameters between the two services for optimal results
 *
 * @param {string} url - The original image URL, typically from Sanity CDN
 * @param {Object} options - Image transformation options
 * @param {number} [options.width] - Desired image width in pixels
 * @param {number} [options.height] - Desired image height in pixels
 * @param {number} [options.quality] - Image quality (1-100)
 * @param {string} [options.fit] - Resize strategy: 'cover', 'contain', 'scale-down', 'none'
 * @param {string} [options.gravity] - Content positioning: 'auto', 'top', 'bottom', 'left', 'right', etc.
 * @param {string} [options.crop] - Sanity-specific crop mode
 * @param {string} [options.format] - Image format: 'auto', 'webp', 'jpeg', 'png', etc.
 * @param {number} [options.blur] - Blur amount
 * @param {number} [options.sharpen] - Sharpen amount
 * @param {number} [options.saturation] - Saturation adjustment
 * @param {number} [options.brightness] - Brightness adjustment
 * @param {number} [options.contrast] - Contrast adjustment
 * @param {number} [options.gamma] - Gamma adjustment
 * @param {number} [options.rotate] - Rotation angle in degrees
 * @param {number} [options.dpr] - Device pixel ratio for responsive images
 * @param {string} [options.background] - Background color (e.g., '#FFFFFF')
 * @param {number} [options.padding] - Padding to add around the image
 * @param {boolean} [options.anim] - Whether to preserve animation in GIFs
 * @param {string} [options.onerror] - Error handling strategy
 * @param {string} [options.compression] - Compression strategy
 * @param {string} [options.fetchFormat] - Format to request from origin
 * @param {string} [options.sampling] - Chroma subsampling strategy
 * @param {string} [options.metadata] - Metadata to preserve
 *
 * @returns {string} The fully constructed image URL with transformations
 */
export function buildImageSRC(url, options = {}) {
  // Return early if url is null, undefined, or empty
  if (!url) {
    return url
  }

  // Process Sanity URL first if applicable
  if (url.includes('cdn.sanity.io')) {
    url = applySanityTransformations(url, options)
  }

  // Then apply Cloudflare transformations
  return applyCloudflareWrapper(url, options)
}

/**
 * Applies Sanity-specific image transformations to a Sanity CDN URL
 *
 * @param {string} url - The Sanity CDN URL
 * @param {Object} options - Image transformation options
 * @returns {string} URL with Sanity transformations applied
 * @private
 */
export function applySanityTransformations(url, options) {
  const { width, height, quality } = options

  const sanityOptions = ['fm=webp']

  // Dimensions
  if (width) sanityOptions.push(`w=${width}`)
  if (height) sanityOptions.push(`h=${height}`)
  if (quality) sanityOptions.push(`q=${quality}`)

  // Add parameters to Sanity URL
  const sanityQuery = sanityOptions.length > 0 ? `?${sanityOptions.join('&')}` : ''
  return `${url}${sanityQuery}`
}

/**
 * Wraps a URL with Cloudflare's Image Resizing service and applies transformations
 *
 * @param {string} url - The source URL (can be any image URL)
 * @param {Object} options - Image transformation options
 * @returns {string} URL with Cloudflare transformations applied
 * @private
 */
export function applyCloudflareWrapper(url, options) {
  const {
    width,
    height,
    quality,
    fit,
    gravity,
    format,
    blur,
    sharpen,
    brightness,
    contrast,
    gamma,
    rotate,
    dpr,
    background,
    padding,
    anim,
    onerror,
    compression,
    fetchFormat,
    sampling,
    metadata,
  } = options

  const cloudflareOptions = []

  // Build Cloudflare options - required parameters
  if (width) cloudflareOptions.push(`width=${width}`)
  if (height) cloudflareOptions.push(`height=${height}`)
  if (quality) cloudflareOptions.push(`quality=${quality}`)

  // Add optional Cloudflare parameters
  if (format) cloudflareOptions.push(`format=${format}`)
  if (fit) cloudflareOptions.push(`fit=${fit}`)
  if (gravity) cloudflareOptions.push(`gravity=${gravity}`)

  if (sharpen !== null && sharpen !== undefined) cloudflareOptions.push(`sharpen=${sharpen}`)
  if (blur !== null && blur !== undefined) cloudflareOptions.push(`blur=${blur}`)
  if (brightness !== null && brightness !== undefined)
    cloudflareOptions.push(`brightness=${brightness}`)
  if (contrast !== null && contrast !== undefined) cloudflareOptions.push(`contrast=${contrast}`)
  if (gamma !== null && gamma !== undefined) cloudflareOptions.push(`gamma=${gamma}`)
  if (rotate !== null && rotate !== undefined) cloudflareOptions.push(`rotate=${rotate}`)
  if (dpr !== null && dpr !== undefined) cloudflareOptions.push(`dpr=${dpr}`)

  if (metadata !== null && metadata !== undefined) cloudflareOptions.push(`metadata=${metadata}`)
  if (onerror !== null && onerror !== undefined) cloudflareOptions.push(`onerror=${onerror}`)
  if (anim === false) cloudflareOptions.push('anim=false')
  if (background !== null && background !== undefined)
    cloudflareOptions.push(`background=${background}`)
  if (fetchFormat !== null && fetchFormat !== undefined)
    cloudflareOptions.push(`fetchFormat=${fetchFormat}`)
  if (compression !== null && compression !== undefined)
    cloudflareOptions.push(`compression=${compression}`)
  if (sampling !== null && sampling !== undefined) cloudflareOptions.push(`sampling=${sampling}`)
  if (padding !== null && padding !== undefined) cloudflareOptions.push(`padding=${padding}`)

  const optionsString = cloudflareOptions.length > 0 ? cloudflareOptions.join(',') : ''

  return `https://www.musora.com/cdn-cgi/image/${optionsString}/${url}`
}
