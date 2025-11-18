/** @typedef {Map<string, import('./types').AwardDefinition>} AwardDefinitionsMap */
/** @typedef {Map<number, string[]>} ContentToAwardsMap */

class AwardDefinitionsService {
  constructor() {
    /** @type {AwardDefinitionsMap} */
    this.definitions = new Map()

    /** @type {ContentToAwardsMap} */
    this.contentIndex = new Map()

    /** @type {number} */
    this.lastFetch = 0

    /** @type {number} */
    this.cacheDuration = 5 * 60 * 1000

    /** @type {boolean} */
    this.isFetching = false
  }

  /** @returns {Promise<import('./types').AwardDefinition[]>} */
  async getAll(forceRefresh = false) {
    if (this.shouldRefresh() || forceRefresh) {
      await this.fetchFromSanity()
    }
    return Array.from(this.definitions.values())
  }

  /** @returns {Promise<import('./types').AwardDefinition | null>} */
  async getById(awardId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return this.definitions.get(awardId) || null
  }

  /** @returns {Promise<import('./types').AwardDefinition[]>} */
  async getByContentId(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }

    const awardIds = this.contentIndex.get(contentId) || []
    return awardIds
      .map(id => this.definitions.get(id))
      .filter(Boolean)
  }

  /** @returns {Promise<boolean>} */
  async hasAwards(contentId) {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return (this.contentIndex.get(contentId)?.length ?? 0) > 0
  }

  /** @returns {Promise<void>} */
  async fetchFromSanity() {
    if (this.isFetching) {
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

      this.definitions.clear()
      this.contentIndex.clear()

      awards.forEach(award => {
        this.definitions.set(award._id, award)

        if (award.content_id) {
          const existing = this.contentIndex.get(award.content_id) || []
          this.contentIndex.set(award.content_id, [...existing, award._id])
        }
      })

      this.lastFetch = Date.now()
    } catch (error) {
      console.error('Failed to fetch award definitions from Sanity:', error)
    } finally {
      this.isFetching = false
    }
  }

  /** @returns {boolean} */
  shouldRefresh() {
    return this.definitions.size === 0 ||
           (Date.now() - this.lastFetch) > this.cacheDuration
  }

  /** @returns {Promise<void>} */
  async refresh() {
    await this.fetchFromSanity()
  }

  clear() {
    this.definitions.clear()
    this.contentIndex.clear()
    this.lastFetch = 0
  }

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

export const awardDefinitions = new AwardDefinitionsService()
