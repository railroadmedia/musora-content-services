/**
 * Service for fetching and caching award definitions from Sanity
 * Provides 5-minute cache with automatic refresh
 *
 * @typedef {Map<string, import('./types').AwardDefinition>} AwardDefinitionsMap
 * @typedef {Map<number, string[]>} ContentToAwardsMap
 */

class AwardDefinitionsService {
  constructor() {
    /** @type {AwardDefinitionsMap} */
    this.definitions = new Map()

    /** @type {ContentToAwardsMap} */
    this.contentIndex = new Map()

    /** @type {number} */
    this.lastFetch = 0

    /** @type {number} */
    this.cacheDuration = 5 * 60 * 1000 // 5 minutes

    /** @type {boolean} */
    this.isFetching = false
  }

  /**
   * Get all award definitions (cached)
   * @param {boolean} [forceRefresh=false] - Force refresh from Sanity
   * @returns {Promise<import('./types').AwardDefinition[]>}
   */
  async getAll(forceRefresh = false) {
    if (this.shouldRefresh() || forceRefresh) {
      await this.fetchFromSanity()
    }
    return Array.from(this.definitions.values())
  }

  /**
   * Get award definition by ID
   * @param {string} awardId - Award ID
   * @returns {Promise<import('./types').AwardDefinition | null>}
   */
  async getById(awardId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return this.definitions.get(awardId) || null
  }

  /**
   * Get all awards associated with a content ID
   * @param {number} contentId - Content ID
   * @returns {Promise<import('./types').AwardDefinition[]>}
   */
  async getByContentId(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }

    const awardIds = this.contentIndex.get(contentId) || []
    return awardIds
      .map(id => this.definitions.get(id))
      .filter(Boolean)
  }

  /**
   * Check if content has associated awards
   * @param {number} contentId - Content ID
   * @returns {Promise<boolean>}
   */
  async hasAwards(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return (this.contentIndex.get(contentId)?.length ?? 0) > 0
  }

  /**
   * Fetch award definitions from Sanity
   * @private
   * @returns {Promise<void>}
   */
  async fetchFromSanity() {
    if (this.isFetching) {
      // Wait for existing fetch to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isFetching) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }

    this.isFetching = true

    try {
      // Import dynamically to avoid circular dependencies
      const { default: sanityClient } = await import('../sanity')

      const query = `*[_type == "award" && is_active == true] {
        _id,
        name,
        badge,
        award,
        brand,
        is_active,
        content_id,
        has_kickoff,
        instructor_name,
        instructor_signature,
        award_custom_text,
        description,
        "type": "content-award"
      }`

      const awards = await sanityClient.fetch(query)

      // Clear and rebuild cache
      this.definitions.clear()
      this.contentIndex.clear()

      awards.forEach(award => {
        // Store definition
        this.definitions.set(award._id, award)

        // Index by content_id for fast lookup
        if (award.content_id) {
          const existing = this.contentIndex.get(award.content_id) || []
          this.contentIndex.set(award.content_id, [...existing, award._id])
        }
      })

      this.lastFetch = Date.now()
    } catch (error) {
      console.error('Failed to fetch award definitions from Sanity:', error)
      // Don't throw - allow stale cache to be used
    } finally {
      this.isFetching = false
    }
  }

  /**
   * Check if cache should be refreshed
   * @private
   * @returns {boolean}
   */
  shouldRefresh() {
    return this.definitions.size === 0 ||
           (Date.now() - this.lastFetch) > this.cacheDuration
  }

  /**
   * Manually refresh cache
   * @returns {Promise<void>}
   */
  async refresh() {
    await this.fetchFromSanity()
  }

  /**
   * Clear cache
   * @returns {void}
   */
  clear() {
    this.definitions.clear()
    this.contentIndex.clear()
    this.lastFetch = 0
  }

  /**
   * Get cache stats (for debugging)
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      totalDefinitions: this.definitions.size,
      totalContentMappings: this.contentIndex.size,
      lastFetch: this.lastFetch ? new Date(this.lastFetch).toISOString() : null,
      cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
      isFetching: this.isFetching
    }
  }
}

// Singleton instance
export const awardDefinitions = new AwardDefinitionsService()
